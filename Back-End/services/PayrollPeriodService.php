<?php

require_once __DIR__ . '/PayrollEngine.php';
require_once __DIR__ . '/PayrollInputs.php';
require_once __DIR__ . '/../models/AttendanceRecordModel.php';

class PayrollPeriodException extends RuntimeException
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

class PayrollPeriodService
{
    private PayrollModel $payrollModel;

    public function __construct(?PayrollModel $payrollModel = null)
    {
        $this->payrollModel = $payrollModel ?? new PayrollModel();
    }

    public function lock(int $periodId): array
    {
        $this->payrollModel->beginTransaction();

        try {
            $period = $this->payrollModel->getPeriodByIdForUpdate($periodId);
            if (!$period) {
                throw new PayrollPeriodException(404, 'Không tìm thấy kỳ lương');
            }
            if ($period['status'] !== 'DRAFT') {
                throw new PayrollPeriodException(409, 'Chỉ được khóa kỳ lương ở trạng thái DRAFT');
            }

            $rows = $this->payrollModel->getAttendanceRows($periodId);
            if ($rows === []) {
                throw new PayrollPeriodException(422, 'Kỳ lương chưa có dữ liệu nhân viên');
            }
            if (count($rows) > 10000) {
                throw new PayrollPeriodException(422, 'Kỳ lương vượt quá giới hạn 10000 nhân viên');
            }

            $attendanceModel = new AttendanceRecordModel();
            if (!$attendanceModel->tableExists()) {
                throw new PayrollPeriodException(409, 'Chưa có bảng chấm công theo ngày — hãy chạy migration 004_avatar_daily_attendance.sql');
            }
            $inputs = new PayrollInputs($period['month_year']);

            $standardDays = (int) $period['standard_days'];
            if ($standardDays < 1 || $standardDays > 31) {
                throw new PayrollPeriodException(422, 'Kỳ lương có số ngày công chuẩn không hợp lệ');
            }
            $daysInMonth = (int) (new DateTimeImmutable($period['month_year'] . '-01'))->format('t');
            $missingAttendance = [];
            $missingContracts = [];
            $staleCalculations = [];
            $staleAttendance = [];
            foreach ($rows as $row) {
                if ($row['payroll_item_id'] === null) {
                    $missingAttendance[] = $row['employee_code'];
                }
                if ($row['base_salary'] === null || $row['insurance_salary'] === null) {
                    $missingContracts[] = $row['employee_code'];
                    continue;
                }

                $actualDays = (float) $row['actual_days'];
                $currentActualDays = $inputs->actualDays((int) $row['user_id']);
                if ($actualDays !== (float) $currentActualDays) {
                    $staleAttendance[] = $row['employee_code'];
                }
                $otHours = (float) $row['ot_hours'];
                if (!is_finite($actualDays) || $actualDays < 0 || $actualDays > $daysInMonth
                    || !is_finite($otHours) || $otHours < 0 || $otHours > $daysInMonth * 24
                ) {
                    throw new PayrollPeriodException(422, 'Ngày công/OT không hợp lệ trong dữ liệu kỳ lương', [
                        'employee_code' => $row['employee_code'],
                    ]);
                }

                $calculation = $inputs->calculate($row, $standardDays, $otHours);
                foreach (['gross_salary', 'social_insurance', 'tax_deduction', 'personal_tax', 'net_salary'] as $field) {
                    if (abs((float) $row[$field] - $calculation[$field]) >= 0.01) {
                        $staleCalculations[] = $row['employee_code'];
                        break;
                    }
                }
            }

            if ($missingAttendance !== []) {
                throw new PayrollPeriodException(422, 'Không thể khóa kỳ khi còn thiếu OT', [
                    'employee_codes' => $missingAttendance,
                ]);
            }
            if ($missingContracts !== []) {
                throw new PayrollPeriodException(422, 'Không thể khóa kỳ khi nhân viên thiếu hợp đồng lương', [
                    'employee_codes' => $missingContracts,
                ]);
            }
            if ($staleAttendance !== []) {
                throw new PayrollPeriodException(409, 'Chấm công theo ngày đã thay đổi — hãy chạy lại bảng lương trước khi khóa sổ', [
                    'employee_codes' => array_values(array_unique($staleAttendance)),
                ]);
            }
            if ($staleCalculations !== []) {
                throw new PayrollPeriodException(409, 'Hãy chạy lại bảng lương trước khi khóa sổ', [
                    'employee_codes' => array_values(array_unique($staleCalculations)),
                ]);
            }
            if (!$this->payrollModel->changePeriodStatus($periodId, 'DRAFT', 'LOCKED')) {
                throw new PayrollPeriodException(409, 'Kỳ lương đã được thay đổi bởi một yêu cầu khác');
            }

            $lockedPeriod = $this->payrollModel->getPeriodById($periodId);
            $items = $this->payrollModel->getItemsByPeriod($periodId);
            $notificationModel = new NotificationModel();
            foreach ($items as $item) {
                $notificationModel->createForUser(
                    (int) $item['user_id'],
                    'PAYROLL_PUBLISHED',
                    'Phiếu lương đã được phát hành',
                    "Phiếu lương tháng {$period['month_year']} đã được phát hành. Bạn có thể xem và tải phiếu lương.",
                    '/nhan-vien/phieu-luong'
                );
            }

            $this->payrollModel->commit();
        } catch (Throwable $e) {
            $this->payrollModel->rollBack();
            throw $e;
        }

        return [
            'period' => $lockedPeriod,
            'locked_count' => count($items),
            'items' => $items,
        ];
    }
}
