<?php

require_once __DIR__ . '/../configs/env.php';
require_once __DIR__ . '/../models/BaseModel.php';
require_once __DIR__ . '/../models/SalaryAdjustmentSql.php';
require_once __DIR__ . '/../models/PayrollModel.php';
require_once __DIR__ . '/../services/PayrollInputs.php';

$model = new PayrollModel();
$synced = 0;

foreach ($model->getAllPeriods() as $period) {
    if ($period['status'] !== 'DRAFT') {
        continue;
    }

    $periodId = (int) $period['id'];
    $standardDays = (int) $period['standard_days'];
    $inputs = new PayrollInputs($period['month_year']);

    foreach ($model->getAttendanceRows($periodId) as $row) {
        if ($row['payroll_item_id'] === null || $row['base_salary'] === null) {
            continue;
        }

        $userId = (int) $row['user_id'];
        $otHours = $inputs->otHours($userId);
        $actualDays = $inputs->actualDays($userId);
        $calculation = $inputs->calculate(
            array_merge($row, ['user_id' => $userId]),
            $standardDays,
            $otHours
        );

        $model->saveOrUpdate($periodId, $userId, [
            'actual_days' => $actualDays,
            'ot_hours' => $otHours,
            'gross_salary' => $calculation['gross_salary'],
            'social_insurance' => $calculation['social_insurance'],
            'tax_deduction' => $calculation['tax_deduction'],
            'personal_tax' => $calculation['personal_tax'],
            'net_salary' => $calculation['net_salary'],
            'breakdown' => $calculation['breakdown'],
        ], 'Đồng bộ OT từ dữ liệu chấm công theo ngày', 1);
        $synced++;
    }
}

echo "Đã đồng bộ OT cho {$synced} dòng lương ở kỳ DRAFT.\n";
