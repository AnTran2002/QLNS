<?php
/**
 * Bổ sung cột `payroll_items.breakdown` (diễn giải chi tiết) cho các phiếu lương đã có trước migration 009.
 * Chỉ ghi khi tính lại bằng đúng dữ liệu đã lưu (ngày công, OT, hợp đồng hiệu lực) ra CÙNG số thực nhận —
 * không bao giờ thay đổi số tiền của kỳ đã khóa.
 *
 *   php Back-End/database/backfill_payroll_breakdown.php
 */
require_once __DIR__ . '/../configs/env.php';
require_once __DIR__ . '/../models/BaseModel.php';
require_once __DIR__ . '/../models/SalaryAdjustmentSql.php';
require_once __DIR__ . '/../models/PayrollModel.php';
require_once __DIR__ . '/../services/PayrollEngine.php';

$model = new PayrollModel();
$filled = 0;
$skipped = [];
foreach ($model->getAllPeriods() as $period) {
    $year = (int) substr($period['month_year'], 0, 4);
    foreach ($model->getAttendanceRows((int) $period['id']) as $row) {
        if ($row['payroll_item_id'] === null || $row['base_salary'] === null) {
            continue;
        }
        $calc = PayrollEngine::calculateNetSalary(
            (float) $row['base_salary'], (float) $row['allowance'], (float) $row['actual_days'],
            (int) $period['standard_days'], (float) $row['ot_hours'], 1.5,
            (int) $row['dependents_count'], (float) $row['insurance_salary'], $year
        );
        if (abs($calc['net_salary'] - (float) $row['net_salary']) >= 1) {
            $skipped[] = $period['month_year'] . ' ' . $row['employee_code'];
            continue;
        }
        $model->query('SELECT 1'); // giữ kết nối
        $stmt = (new ReflectionProperty(BaseModel::class, 'connection'))->getValue()
            ->prepare('UPDATE payroll_items SET breakdown = :b WHERE id = :id AND breakdown IS NULL');
        $stmt->execute(['b' => PayrollModel::encodeBreakdown($calc['breakdown']), 'id' => $row['payroll_item_id']]);
        $filled += $stmt->rowCount();
    }
}
echo "Đã bổ sung diễn giải cho {$filled} phiếu lương.\n";
if ($skipped) {
    echo "Bỏ qua (số liệu đã lưu khác cách tính hiện tại — hãy chạy lại kỳ DRAFT): " . implode(', ', $skipped) . "\n";
}
