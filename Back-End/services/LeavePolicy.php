<?php

/**
 * Quy tắc nghỉ phép — hàm thuần (không chạm CSDL) để kiểm thử độc lập (tests/backend).
 *
 * Căn cứ: Bộ luật Lao động 2019
 *   · Điều 113: 12 ngày phép năm hưởng nguyên lương; làm chưa đủ 12 tháng thì tính theo tỉ lệ số tháng.
 *   · Điều 114: cứ đủ 5 năm làm việc cho một người sử dụng lao động thì được thêm 1 ngày.
 *   · Điều 115: nghỉ việc riêng có lương (kết hôn, tang…) — không trừ vào phép năm.
 *   · Nghỉ ốm do quỹ BHXH chi trả (Luật BHXH) — không trừ vào phép năm.
 */
final class LeavePolicy
{
    public const TYPES = [
        'ANNUAL' => 'Phép năm',
        'SICK'   => 'Nghỉ ốm',
        'UNPAID' => 'Nghỉ không lương',
        'OTHER'  => 'Việc riêng có lương',
    ];

    public const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

    public const BASE_ANNUAL_DAYS = 12;
    public const SENIORITY_STEP_YEARS = 5;
    /** Một đơn tối đa 30 ngày làm việc (dài hơn → nghỉ không lương dài hạn, xử lý ngoài hệ thống). */
    public const MAX_WORKDAYS = 30;

    /** Các ngày làm việc (T2–T6) trong [start, end], định dạng Y-m-d. */
    public static function workdays(string $start, string $end): array
    {
        $from = self::parseDate($start);
        $to   = self::parseDate($end);
        if (!$from || !$to || $from > $to) {
            return [];
        }
        $days = [];
        for ($d = $from; $d <= $to; $d = $d->modify('+1 day')) {
            if ((int) $d->format('N') <= 5) {
                $days[] = $d->format('Y-m-d');
            }
        }
        return $days;
    }

    /** Quỹ phép năm `$year` của người vào làm ngày `$joinedAt` (null → đủ 12 ngày). */
    public static function annualQuota(?string $joinedAt, int $year): int
    {
        $joined = $joinedAt ? self::parseDate(substr($joinedAt, 0, 10)) : null;
        if (!$joined) {
            return self::BASE_ANNUAL_DAYS;
        }
        $joinYear = (int) $joined->format('Y');
        if ($joinYear > $year) {
            return 0;
        }
        if ($joinYear === $year) {
            // Năm đầu: tỉ lệ theo số tháng còn lại tính cả tháng vào làm (12 ngày / 12 tháng).
            $months = 13 - (int) $joined->format('n');
            return (int) round(self::BASE_ANNUAL_DAYS * $months / 12);
        }
        $yearEnd = new DateTimeImmutable("{$year}-12-31");
        $years   = $joined->diff($yearEnd)->y;
        return self::BASE_ANNUAL_DAYS + intdiv($years, self::SENIORITY_STEP_YEARS);
    }

    /**
     * Kiểm tra đơn mới. Trả về [lỗi|null, danh sách ngày làm việc].
     * `$today` truyền vào để kiểm thử được (mặc định hôm nay).
     */
    public static function validate(array $input, ?string $today = null): array
    {
        $type   = $input['type'] ?? '';
        $start  = (string) ($input['start_date'] ?? '');
        $end    = (string) ($input['end_date'] ?? '');
        $reason = trim((string) ($input['reason'] ?? ''));
        $today  = self::parseDate($today ?? date('Y-m-d'));

        if (!array_key_exists($type, self::TYPES)) {
            return ['Loại nghỉ không hợp lệ', []];
        }
        $from = self::parseDate($start);
        $to   = self::parseDate($end);
        if (!$from || !$to) {
            return ['Ngày bắt đầu / kết thúc phải có dạng YYYY-MM-DD', []];
        }
        if ($from > $to) {
            return ['Ngày kết thúc phải sau hoặc trùng ngày bắt đầu', []];
        }
        if ($from->format('Y') !== $to->format('Y')) {
            return ['Đơn không được kéo dài sang năm khác — hãy tách thành 2 đơn', []];
        }
        if ($from < $today) {
            return ['Ngày bắt đầu không được ở quá khứ', []];
        }
        $days = self::workdays($start, $end);
        if (!$days) {
            return ['Khoảng thời gian đã chọn không có ngày làm việc nào (T2–T6)', []];
        }
        if (count($days) > self::MAX_WORKDAYS) {
            return ['Mỗi đơn tối đa ' . self::MAX_WORKDAYS . ' ngày làm việc', []];
        }
        $len = mb_strlen($reason);
        if ($len < 3 || $len > 500) {
            return ['Lý do cần từ 3 đến 500 ký tự', []];
        }
        return [null, $days];
    }

    private static function parseDate(string $value): ?DateTimeImmutable
    {
        $d = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        return $d && $d->format('Y-m-d') === $value ? $d : null;
    }
}
