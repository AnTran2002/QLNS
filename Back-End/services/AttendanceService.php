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

class AttendanceService
{
    private PayrollModel $payrollModel;

    public function __construct(?PayrollModel $payrollModel = null)
    {
        $this->payrollModel = $payrollModel ?? new PayrollModel();
    }

    public function save(int $periodId, array $entries): array
    {
        $this->payrollModel->beginTransaction();

        try {
            $period = $this->payrollModel->getPeriodByIdForUpdate($periodId);
            if (!$period) {
                throw new AttendanceException(404, 'Không tìm thấy kỳ lương');
            }
            if ($period['status'] !== 'DRAFT') {
                throw new AttendanceException(409, 'Chỉ được nhập liệu cho kỳ lương ở trạng thái DRAFT');
            }

            $standardDays = (int) $period['standard_days'];
            if ($standardDays < 1 || $standardDays > 31) {
                throw new AttendanceException(422, 'Kỳ lương có số ngày công chuẩn không hợp lệ');
            }

            $daysInMonth = (int) (new DateTimeImmutable($period['month_year'] . '-01'))->format('t');
            $normalizedEntries = $this->normalizeEntries($entries, $daysInMonth);
            $userIds = array_column($normalizedEntries, 'user_id');
            $payrollInputs = $this->payrollModel->getPayrollInputsByUserIds($userIds);

            $missingUserIds = array_values(array_diff($userIds, array_keys($payrollInputs)));
            if ($missingUserIds !== []) {
                throw new AttendanceException(422, 'Có nhân viên không tồn tại', [
                    'user_ids' => $missingUserIds,
                ]);
            }

            $missingContracts = [];
            foreach ($normalizedEntries as $entry) {
                $employee = $payrollInputs[$entry['user_id']];
                if ($employee['contract_id'] === null) {
                    $missingContracts[] = $employee['employee_code'];
                }
            }
            if ($missingContracts !== []) {
                throw new AttendanceException(422, 'Nhân viên chưa có hợp đồng lương', [
                    'employee_codes' => array_values(array_unique($missingContracts)),
                ]);
            }

            $calculations = [];
            foreach ($normalizedEntries as $entry) {
                $employee = $payrollInputs[$entry['user_id']];
                $calculation = PayrollEngine::calculateNetSalary(
                    (float) $employee['base_salary'],
                    (float) $employee['allowance'],
                    $entry['actual_days'],
                    $standardDays,
                    $entry['ot_hours'],
                    1.5,
                    (int) $employee['dependents_count'],
                    (float) $employee['insurance_salary']
                );
                $calculations[$entry['user_id']] = $calculation;

                $this->payrollModel->saveOrUpdate($periodId, $entry['user_id'], [
                    'actual_days' => $entry['actual_days'],
                    'ot_hours' => $entry['ot_hours'],
                    'gross_salary' => $calculation['gross_salary'],
                    'social_insurance' => $calculation['social_insurance'],
                    'tax_deduction' => $calculation['tax_deduction'],
                    'personal_tax' => $calculation['personal_tax'],
                    'net_salary' => $calculation['net_salary'],
                ]);
            }

            $items = $this->payrollModel->getAttendanceRows($periodId);
            $this->payrollModel->commit();
        } catch (Throwable $e) {
            $this->payrollModel->rollBack();
            throw $e;
        }

        return [
            'period' => $period,
            'updated_count' => count($normalizedEntries),
            'calculations' => $calculations,
            'items' => $items,
        ];
    }

    private function normalizeEntries(array $entries, int $daysInMonth): array
    {
        if ($entries === [] || count($entries) > 10000) {
            throw new AttendanceException(422, 'entries phải có từ 1 đến 10000 bản ghi');
        }

        $normalized = [];
        $seenUserIds = [];
        foreach ($entries as $index => $entry) {
            if (!is_array($entry)) {
                throw new AttendanceException(422, 'Bản ghi ngày công không hợp lệ', [
                    'entry_index' => $index,
                ]);
            }

            $userId = filter_var($entry['user_id'] ?? null, FILTER_VALIDATE_INT, [
                'options' => ['min_range' => 1],
            ]);
            if ($userId === false) {
                throw new AttendanceException(422, 'user_id phải là số nguyên dương', [
                    'entry_index' => $index,
                ]);
            }
            if (isset($seenUserIds[$userId])) {
                throw new AttendanceException(422, 'Danh sách có nhân viên bị lặp', [
                    'user_id' => (int) $userId,
                ]);
            }
            $seenUserIds[$userId] = true;

            $actualDays = $this->nonNegativeNumber($entry['actual_days'] ?? null, 'actual_days', $index);
            if ($actualDays > $daysInMonth) {
                throw new AttendanceException(422, "actual_days không được vượt quá {$daysInMonth}", [
                    'entry_index' => $index,
                ]);
            }

            $otHours = $this->nonNegativeNumber($entry['ot_hours'] ?? null, 'ot_hours', $index);
            if ($otHours > $daysInMonth * 24) {
                throw new AttendanceException(422, 'ot_hours vượt giới hạn giờ trong tháng', [
                    'entry_index' => $index,
                ]);
            }

            $normalized[] = [
                'user_id' => (int) $userId,
                'actual_days' => $actualDays,
                'ot_hours' => $otHours,
            ];
        }

        return $normalized;
    }

    private function nonNegativeNumber($value, string $field, int $index): float
    {
        if ((!is_string($value) && !is_int($value) && !is_float($value))
            || !is_numeric($value)
            || !is_finite((float) $value)
            || (float) $value < 0
        ) {
            throw new AttendanceException(422, "{$field} phải là số không âm hợp lệ", [
                'entry_index' => $index,
                'field' => $field,
            ]);
        }

        return (float) $value;
    }
}
