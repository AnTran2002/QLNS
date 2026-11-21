<?php

require_once __DIR__ . '/PayrollEngine.php';

class AttendanceException extends RuntimeException
{
    public int $statusCode;
    public array $details;

    public function __construct(int $statusCode, string $message, array $details = [])
    {
        parent::__construct($message);
        $this->statusCode = $statusCode;
        $this->details = $details;
    }
}

/**
 * Ngày công & OT của kỳ lương được tổng hợp TỰ ĐỘNG từ bảng chấm công theo ngày
 * (attendance_records) — không nhập tay, không import.
 *
 *   Công thực tế = ngày PRESENT + LATE + REMOTE + LEAVE có lương
 *                  (LEAVE thuộc đơn UNPAID / SICK đã duyệt không tính: nghỉ ốm do quỹ BHXH chi trả),
 *                  tối đa bằng công chuẩn.
 *   Giờ OT       = tổng ot_hours trong tháng.
 *   Công chuẩn   = số ngày T2–T6 trong tháng.
 */
class AttendanceService
{
    private PayrollModel $payrollModel;
    private AttendanceRecordModel $records;

    public function __construct(?PayrollModel $payrollModel = null, ?AttendanceRecordModel $records = null)
    {
        $this->payrollModel = $payrollModel ?? new PayrollModel();
        $this->records = $records ?? new AttendanceRecordModel();
    }

    /** Số ngày làm việc T2–T6 của tháng `YYYY-MM`. */
    public static function weekdaysInMonth(string $monthYear): int
    {
        $first = new DateTimeImmutable($monthYear . '-01');
        $days = (int) $first->format('t');
        $count = 0;
        for ($d = 0; $d < $days; $d++) {
            if ((int) $first->modify("+{$d} day")->format('N') <= 5) {
                $count++;
            }
        }
        return $count;
    }

    /**
     * Đồng bộ ngày công/OT từ chấm công rồi tính và lưu lương cho mọi nhân viên có hợp đồng.
     * Chỉ chạy cho kỳ DRAFT; kỳ đã khoá giữ nguyên số liệu.
     */
    public function sync(int $periodId): array
    {
        $this->payrollModel->beginTransaction();

        try {
            $period = $this->payrollModel->getPeriodByIdForUpdate($periodId);
            if (!$period) {
                throw new AttendanceException(404, 'Không tìm thấy kỳ lương');
            }
            if ($period['status'] !== 'DRAFT') {
                throw new AttendanceException(409, 'Kỳ lương đã khoá sổ — số liệu chấm công không thay đổi nữa');
            }

            $standardDays = self::weekdaysInMonth($period['month_year']);
            if ((int) $period['standard_days'] !== $standardDays) {
                $this->payrollModel->updateStandardDays($periodId, $standardDays);
                $period['standard_days'] = $standardDays;
            }

            $summary = $this->records->tableExists() ? $this->records->monthSummary($period['month_year']) : [];
            $missingContracts = [];
            $synced = 0;

            foreach ($this->payrollModel->getAttendanceRows($periodId) as $row) {
                if ($row['base_salary'] === null || $row['insurance_salary'] === null) {
                    $missingContracts[] = $row['employee_code'];
                    continue;
                }
                $s = $summary[(int) $row['user_id']] ?? null;
                $actualDays = $s ? min($standardDays, (float) $s['paid_days']) : 0.0;
                $otHours = $s ? (float) $s['ot_hours'] : 0.0;

                $calculation = PayrollEngine::calculateNetSalary(
                    (float) $row['base_salary'],
                    (float) $row['allowance'],
                    $actualDays,
                    $standardDays,
                    $otHours,
                    1.5,
                    (int) $row['dependents_count'],
                    (float) $row['insurance_salary']
                );
                $this->payrollModel->saveOrUpdate($periodId, (int) $row['user_id'], [
                    'actual_days' => $actualDays,
                    'ot_hours' => $otHours,
                    'gross_salary' => $calculation['gross_salary'],
                    'social_insurance' => $calculation['social_insurance'],
                    'tax_deduction' => $calculation['tax_deduction'],
                    'personal_tax' => $calculation['personal_tax'],
                    'net_salary' => $calculation['net_salary'],
                ]);
                $synced++;
            }

            $this->payrollModel->commit();
        } catch (Throwable $e) {
            $this->payrollModel->rollBack();
            throw $e;
        }

        return [
            'period' => $period,
            'synced_count' => $synced,
            'missing_contracts' => $missingContracts,
        ];
    }

    /** Bảng ngày công của kỳ kèm phần tách theo trạng thái chấm công (để hiển thị nguồn số liệu). */
    public function rows(array $period): array
    {
        $summary = $this->records->tableExists() ? $this->records->monthSummary($period['month_year']) : [];
        $rows = $this->payrollModel->getAttendanceRows((int) $period['id']);
        foreach ($rows as &$row) {
            $s = $summary[(int) $row['user_id']] ?? [];
            $row['breakdown'] = [
                'present'     => (int) ($s['present'] ?? 0),
                'late'        => (int) ($s['late'] ?? 0),
                'remote'      => (int) ($s['remote'] ?? 0),
                'paid_leave'  => (int) ($s['paid_leave'] ?? 0),
                'unpaid_leave'=> (int) ($s['unpaid_leave'] ?? 0),
                'absent'      => (int) ($s['absent'] ?? 0),
                'recorded_days' => (int) ($s['recorded_days'] ?? 0),
            ];
        }
        unset($row);
        return $rows;
    }

    /** Ngày chấm công gần nhất của tháng (null nếu chưa có). */
    public function lastRecordedDate(string $monthYear): ?string
    {
        return $this->records->tableExists() ? $this->records->lastDateOfMonth($monthYear) : null;
    }
}
