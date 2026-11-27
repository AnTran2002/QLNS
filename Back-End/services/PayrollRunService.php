<?php

require_once __DIR__ . '/PayrollEngine.php';
require_once __DIR__ . '/PayrollInputs.php';
require_once __DIR__ . '/PayrollChangePolicy.php';
require_once __DIR__ . '/../models/AttendanceRecordModel.php';

class PayrollRunException extends RuntimeException
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

class PayrollRunService
{
    private PayrollModel $payrollModel;

    public function __construct(?PayrollModel $payrollModel = null)
    {
        $this->payrollModel = $payrollModel ?? new PayrollModel();
    }

    public function run(int $periodId, array $reasons, int $changedBy): array
    {
        $this->payrollModel->beginTransaction();

        try {
            $period = $this->payrollModel->getPeriodByIdForUpdate($periodId);
            if (!$period) {
                throw new PayrollRunException(404, 'Không tìm thấy kỳ lương');
            }
            if ($period['status'] !== 'DRAFT') {
                throw new PayrollRunException(409, 'Chỉ được chạy lương cho kỳ đang ở trạng thái DRAFT');
            }

            $standardDays = (int) $period['standard_days'];
            if ($standardDays < 1 || $standardDays > 31) {
                throw new PayrollRunException(422, 'Kỳ lương có số ngày công chuẩn không hợp lệ');
            }

            $rows = $this->payrollModel->getAttendanceRows($periodId);
            if ($rows === []) {
                throw new PayrollRunException(422, 'Không có nhân viên để tính lương');
            }
            if (count($rows) > 10000) {
                throw new PayrollRunException(422, 'Kỳ lương vượt quá giới hạn 10000 nhân viên');
            }

            $attendanceModel = new AttendanceRecordModel();
            if (!$attendanceModel->tableExists()) {
                throw new PayrollRunException(409, 'Chưa có bảng chấm công theo ngày — hãy chạy migration 004_avatar_daily_attendance.sql');
            }
            $inputs = new PayrollInputs($period['month_year']);

            $missingAttendance = [];
            $missingContracts = [];
            foreach ($rows as $row) {
                if ($row['payroll_item_id'] === null) {
                    $missingAttendance[] = $row['employee_code'];
                }
                if ($row['base_salary'] === null || $row['insurance_salary'] === null) {
                    $missingContracts[] = $row['employee_code'];
                }
            }

            if ($missingAttendance !== []) {
                throw new PayrollRunException(422, 'Chưa nhập OT cho tất cả nhân viên', [
                    'employee_codes' => $missingAttendance,
                ]);
            }
            if ($missingContracts !== []) {
                throw new PayrollRunException(422, 'Nhân viên chưa có hợp đồng lương', [
                    'employee_codes' => $missingContracts,
                ]);
            }

            $reasonsByUserId = [];
            $missingReasons = [];
            foreach ($rows as $row) {
                [$reasonError, $reason] = PayrollChangePolicy::validateReason($reasons[$row['user_id']] ?? null);
                if ($reasonError !== null) {
                    $missingReasons[] = $row['employee_code'];
                    continue;
                }
                $reasonsByUserId[(int) $row['user_id']] = $reason;
            }
            if ($missingReasons !== []) {
                throw new PayrollRunException(422, 'Cần lý do cụ thể cho từng nhân viên khi chạy lại bảng lương', [
                    'employee_codes' => $missingReasons,
                ]);
            }

            $daysInMonth = (int) (new DateTimeImmutable($period['month_year'] . '-01'))->format('t');
            $totals = [
                'gross_salary' => 0.0,
                'social_insurance' => 0.0,
                'personal_tax' => 0.0,
                'net_salary' => 0.0,
            ];
            foreach ($rows as $row) {
                $actualDays = $inputs->actualDays((int) $row['user_id']);
                $otHours = (float) $row['ot_hours'];
                if (!is_finite($actualDays) || $actualDays < 0 || $actualDays > $daysInMonth) {
                    throw new PayrollRunException(422, 'Ngày công không hợp lệ trong dữ liệu kỳ lương', [
                        'employee_code' => $row['employee_code'],
                    ]);
                }
                if (!is_finite($otHours) || $otHours < 0 || $otHours > $daysInMonth * 24) {
                    throw new PayrollRunException(422, 'Giờ OT không hợp lệ trong dữ liệu kỳ lương', [
                        'employee_code' => $row['employee_code'],
                    ]);
                }

                $calculation = $inputs->calculate($row, $standardDays, $otHours);

                $this->payrollModel->updateCalculation(
                    $periodId,
                    (int) $row['user_id'],
                    $calculation,
                    $reasonsByUserId[(int) $row['user_id']],
                    $changedBy
                );
                foreach (array_keys($totals) as $field) {
                    $totals[$field] += $calculation[$field];
                }
            }

            $items = $this->payrollModel->getItemsByPeriod($periodId);
            $this->payrollModel->commit();
        } catch (Throwable $e) {
            $this->payrollModel->rollBack();
            throw $e;
        }

        foreach ($totals as &$total) {
            $total = round($total, 2);
        }
        unset($total);

        return [
            'period' => $period,
            'calculated_count' => count($rows),
            'totals' => $totals,
            'items' => $items,
        ];
    }
}
