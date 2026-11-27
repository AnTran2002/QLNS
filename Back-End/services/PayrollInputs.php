<?php

require_once __DIR__ . '/PayrollEngine.php';
require_once __DIR__ . '/../models/BaseModel.php';

/**
 * Gom mọi dữ liệu "tiến trình" của nhân viên trong tháng để tính lương tự động:
 * chấm công theo ngày (đi làm / muộn / remote / vắng), OT tách theo ngày thường – nghỉ tuần – lễ,
 * phép năm đã duyệt, ngày lễ hưởng lương, hệ số lương thử việc, vùng lương tối thiểu của chi nhánh.
 *
 * Mọi nơi tính lương (nhập OT, chạy lương, khóa sổ, ước tính tạm tính) đều dùng lớp này để kết quả khớp nhau.
 */
class PayrollInputs extends BaseModel
{
    private string $month;
    private string $throughDate;
    private array $holidays = [];
    private array $attendance = [];
    private array $leave = [];
    private array $profiles = [];

    public function __construct(string $month, ?string $throughDate = null)
    {
        parent::__construct();
        $this->month = $month;
        $start = new DateTimeImmutable($month . '-01');
        $end = $start->modify('last day of this month');
        $today = new DateTimeImmutable($throughDate ?? date('Y-m-d'));
        $this->throughDate = ($today < $end ? $today : $end)->format('Y-m-d');
        $this->load($start->format('Y-m-d'), $end->format('Y-m-d'));
    }

    public function throughDate(): string
    {
        return $this->throughDate;
    }

    public function holidays(): array
    {
        return $this->holidays;
    }

    /** Ngày đi làm thực tế (PRESENT/LATE/REMOTE) đến hôm nay — giữ đúng quy tắc cũ. */
    public function actualDays(int $userId): float
    {
        return (float) ($this->attendance[$userId]['worked'] ?? 0);
    }

    /**
     * Tính lương cho 1 nhân viên.
     * @param array $row cần base_salary, allowance, dependents_count, insurance_salary, user_id
     */
    public function calculate(array $row, int $standardDays, float $otHours, float $projectDays = 0): array
    {
        $holidayLimit = $projectDays > 0 ? $this->month . '-31' : $this->throughDate;
        $userId = (int) $row['user_id'];
        $att = $this->attendance[$userId] ?? [];
        $leave = $this->leave[$userId] ?? [];
        $profile = $this->profiles[$userId] ?? [];

        $otWeekend = (float) ($att['ot_weekend'] ?? 0);
        $otHoliday = (float) ($att['ot_holiday'] ?? 0);
        $workedHolidays = $att['worked_holiday_dates'] ?? [];
        $holidayDays = 0;
        foreach ($this->holidays as $date => $name) {
            if ($date <= $holidayLimit && self::isWeekday($date) && !isset($workedHolidays[$date])) {
                $holidayDays++;
            }
        }

        return PayrollEngine::calculateDetailed([
            'base_salary' => (float) $row['base_salary'],
            'allowance' => (float) $row['allowance'],
            'insurance_salary' => (float) $row['insurance_salary'],
            'dependents' => (int) $row['dependents_count'],
            'standard_days' => $standardDays,
            'actual_days' => $this->actualDays($userId) + $projectDays,
            'paid_leave_days' => (float) (($leave['ANNUAL'] ?? 0) + ($leave['OTHER'] ?? 0)),
            'holiday_days' => $holidayDays,
            'ot_hours' => $otHours,
            'ot_weekend_hours' => $otWeekend,
            'ot_holiday_hours' => $otHoliday,
            'tax_year' => (int) substr($this->month, 0, 4),
            'region' => $profile['region'] ?? 'I',
            'salary_rate' => $this->salaryRate($profile),
            'late_count' => (int) ($att['late'] ?? 0),
            'remote_days' => (float) ($att['remote'] ?? 0),
            'absent_days' => (float) ($att['absent'] ?? 0),
            'unpaid_leave_days' => (float) ($leave['UNPAID'] ?? 0),
            'sick_leave_days' => (float) ($leave['SICK'] ?? 0),
        ]);
    }

    /** Tổng giờ làm thêm đã chấm đến hôm nay. */
    public function otHours(int $userId): float
    {
        return (float) ($this->attendance[$userId]['ot_total'] ?? 0);
    }

    /** Công chuẩn = số ngày thứ 2–6 trong tháng trừ ngày lễ rơi vào thứ 2–6. */
    public function standardDays(): int
    {
        return $this->countWorkdays($this->month . '-01', (new DateTimeImmutable($this->month . '-01'))->modify('last day of this month')->format('Y-m-d'));
    }

    /** Số ngày làm việc còn lại sau mốc tính (dùng để dự kiến lương cả tháng). */
    public function remainingWorkdays(): int
    {
        $from = (new DateTimeImmutable($this->throughDate))->modify('+1 day')->format('Y-m-d');
        $end = (new DateTimeImmutable($this->month . '-01'))->modify('last day of this month')->format('Y-m-d');
        return $from > $end ? 0 : $this->countWorkdays($from, $end);
    }

    private function countWorkdays(string $from, string $to): int
    {
        $n = 0;
        for ($d = new DateTimeImmutable($from); $d->format('Y-m-d') <= $to; $d = $d->modify('+1 day')) {
            $iso = $d->format('Y-m-d');
            if (self::isWeekday($iso) && !isset($this->holidays[$iso])) {
                $n++;
            }
        }
        return $n;
    }

    /** Hệ số lương thử việc chỉ áp dụng khi tháng tính lương còn nằm trong thời gian thử việc. */
    private function salaryRate(array $profile): float
    {
        $rate = (float) ($profile['probation_salary_rate'] ?? 1);
        $days = (int) ($profile['probation_days'] ?? 0);
        $start = $profile['start_date'] ?? null;
        if ($rate >= 1 || $days <= 0 || !$start) {
            return 1.0;
        }
        $probationEnd = (new DateTimeImmutable($start))->modify('+' . $days . ' days')->format('Y-m-d');
        return $this->month . '-01' < $probationEnd ? max(PayrollConfig::MIN_PROBATION_SALARY_RATE, $rate) : 1.0;
    }

    private function load(string $start, string $end): void
    {
        if ($this->tableExists('public_holidays')) {
            $stmt = $this->db->prepare('SELECT holiday_date, name FROM public_holidays WHERE holiday_date BETWEEN :s AND :e');
            $stmt->execute(['s' => $start, 'e' => $end]);
            foreach ($stmt->fetchAll() as $h) {
                $this->holidays[$h['holiday_date']] = $h['name'];
            }
        }

        $stmt = $this->db->prepare(
            "SELECT user_id, work_date, status, COALESCE(ot_hours, 0) AS ot_hours
             FROM attendance_records
             WHERE work_date BETWEEN :s AND :t"
        );
        $stmt->execute(['s' => $start, 't' => $this->throughDate]);
        foreach ($stmt->fetchAll() as $r) {
            $uid = (int) $r['user_id'];
            $a = &$this->attendance[$uid];
            $a ??= ['worked' => 0, 'late' => 0, 'remote' => 0, 'absent' => 0, 'ot_weekend' => 0.0, 'ot_holiday' => 0.0, 'ot_total' => 0.0, 'worked_holiday_dates' => []];
            $date = $r['work_date'];
            $isHoliday = isset($this->holidays[$date]);
            if (in_array($r['status'], ['PRESENT', 'LATE', 'REMOTE'], true)) {
                $a['worked']++;
                if ($isHoliday) {
                    $a['worked_holiday_dates'][$date] = true;
                }
            }
            if ($r['status'] === 'LATE') {
                $a['late']++;
            }
            if ($r['status'] === 'REMOTE') {
                $a['remote']++;
            }
            if ($r['status'] === 'ABSENT') {
                $a['absent']++;
            }
            $ot = (float) $r['ot_hours'];
            if ($ot > 0) {
                $a['ot_total'] += $ot;
                if ($isHoliday) {
                    $a['ot_holiday'] += $ot;
                } elseif (!self::isWeekday($date)) {
                    $a['ot_weekend'] += $ot;
                }
            }
            unset($a);
        }

        if ($this->tableExists('leave_requests')) {
            $stmt = $this->db->prepare(
                "SELECT user_id, type, start_date, end_date
                 FROM leave_requests
                 WHERE status = 'APPROVED' AND start_date <= :e AND end_date >= :s"
            );
            $stmt->execute(['s' => $start, 'e' => $end]);
            foreach ($stmt->fetchAll() as $l) {
                $from = max($l['start_date'], $start);
                $to = min($l['end_date'], $this->throughDate);
                $days = 0;
                for ($d = new DateTimeImmutable($from); $d->format('Y-m-d') <= $to; $d = $d->modify('+1 day')) {
                    $iso = $d->format('Y-m-d');
                    if (self::isWeekday($iso) && !isset($this->holidays[$iso])) {
                        $days++;
                    }
                }
                $uid = (int) $l['user_id'];
                $this->leave[$uid][$l['type']] = ($this->leave[$uid][$l['type']] ?? 0) + $days;
            }
        }

        $hasBranches = $this->tableExists('branches');
        $stmt = $this->db->query(
            $hasBranches
                ? "SELECT u.id, b.region, c.start_date, c.probation_days, c.probation_salary_rate
                   FROM users u
                   LEFT JOIN branches b ON b.id = u.branch_id
                   LEFT JOIN contracts c ON c.id = (SELECT c2.id FROM contracts c2 WHERE c2.user_id = u.id ORDER BY c2.created_at DESC, c2.id DESC LIMIT 1)"
                : "SELECT id FROM users"
        );
        foreach ($stmt->fetchAll() as $p) {
            $this->profiles[(int) $p['id']] = $p;
        }
    }

    private function tableExists(string $table): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?');
        $stmt->execute([$table]);
        return (bool) $stmt->fetch();
    }

    private static function isWeekday(string $date): bool
    {
        return (int) (new DateTimeImmutable($date))->format('N') <= 5;
    }
}
