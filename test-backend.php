<?php
/**
 * Kiểm thử Back-End thuần (không cần CSDL, không cần PHPUnit):
 *   php test-backend.php          (hoặc trong Front-End: npm run test:backend)
 * Nạp trực tiếp mã thật trong Back-End/services — không sao chép, không thêm file vào Back-End.
 */
declare(strict_types=1);

$services = __DIR__ . '/Back-End/services/';
require $services . 'LeavePolicy.php';
require $services . 'PayrollEngine.php';
require $services . 'PayrollPeriodPolicy.php';
require $services . 'ContractSalaryAdjustmentPolicy.php';

$passed = 0;
$failed = [];

function check(string $name, $actual, $expected): void
{
    global $passed, $failed;
    if ($actual === $expected) {
        $passed++;
        echo "  \033[32m✓\033[0m $name\n";
    } else {
        $failed[] = $name;
        echo "  \033[31m✗\033[0m $name\n      mong đợi: " . var_export($expected, true) . "\n      thực tế:  " . var_export($actual, true) . "\n";
    }
}

function near(float $a, float $b, float $eps = 0.01): bool
{
    return abs($a - $b) < $eps;
}

echo "\nLeavePolicy::workdays\n";
check('T2–T3 = 2 ngày', LeavePolicy::workdays('2026-12-07', '2026-12-08'), ['2026-12-07', '2026-12-08']);
check('T7–CN = 0 ngày', LeavePolicy::workdays('2026-12-05', '2026-12-06'), []);
check('khoảng ngược = rỗng', LeavePolicy::workdays('2026-12-08', '2026-12-07'), []);
check('ngày sai định dạng = rỗng', LeavePolicy::workdays('2026-02-30', '2026-03-02'), []);
check('04/12 → 14/12 = 7 ngày', count(LeavePolicy::workdays('2026-12-04', '2026-12-14')), 7);

echo "\nLeavePolicy::annualQuota (BLLĐ 2019 Điều 113, 114)\n";
check('không có ngày vào làm → 12', LeavePolicy::annualQuota(null, 2026), 12);
check('vào làm 01/2026 → 12', LeavePolicy::annualQuota('2026-01-02', 2026), 12);
check('vào làm 07/2026 → 6 (tỉ lệ 6/12 tháng)', LeavePolicy::annualQuota('2026-07-15', 2026), 6);
check('vào làm 12/2026 → 1', LeavePolicy::annualQuota('2026-12-01', 2026), 1);
check('vào làm năm sau → 0', LeavePolicy::annualQuota('2027-01-01', 2026), 0);
check('đủ 4 năm → 12', LeavePolicy::annualQuota('2022-03-01', 2026), 12);
check('đủ 5 năm → 13', LeavePolicy::annualQuota('2021-03-01', 2026), 13);
check('đủ 10 năm → 14', LeavePolicy::annualQuota('2016-01-01', 2026), 14);
check('chấp nhận DATETIME', LeavePolicy::annualQuota('2021-03-01 08:00:00', 2026), 13);

echo "\nLeavePolicy::validate\n";
$today = '2026-11-20';
$ok = ['type' => 'ANNUAL', 'start_date' => '2026-12-07', 'end_date' => '2026-12-08', 'reason' => 'Về quê'];
check('đơn hợp lệ', LeavePolicy::validate($ok, $today), [null, ['2026-12-07', '2026-12-08']]);
check('loại sai', LeavePolicy::validate(['type' => 'X'] + $ok, $today)[0], 'Loại nghỉ không hợp lệ');
check('ngày sai định dạng', LeavePolicy::validate(['start_date' => '07/12/2026'] + $ok, $today)[0], 'Ngày bắt đầu / kết thúc phải có dạng YYYY-MM-DD');
check('kết thúc trước bắt đầu', LeavePolicy::validate(['end_date' => '2026-12-01'] + $ok, $today)[0], 'Ngày kết thúc phải sau hoặc trùng ngày bắt đầu');
check('vắt sang năm khác', LeavePolicy::validate(['end_date' => '2027-01-04'] + $ok, $today)[0], 'Đơn không được kéo dài sang năm khác — hãy tách thành 2 đơn');
check('phép năm ở quá khứ', LeavePolicy::validate(['start_date' => '2026-11-19', 'end_date' => '2026-11-19'] + $ok, $today)[0], 'Ngày bắt đầu không được ở quá khứ');
check('nghỉ ốm khai bù 10 ngày → hợp lệ', LeavePolicy::validate(['type' => 'SICK', 'start_date' => '2026-11-10', 'end_date' => '2026-11-10'] + $ok, $today)[0], null);
check('nghỉ ốm khai bù 40 ngày → lỗi', LeavePolicy::validate(['type' => 'SICK', 'start_date' => '2026-10-09', 'end_date' => '2026-10-09'] + $ok, $today)[0], 'Nghỉ ốm chỉ khai bù tối đa 30 ngày trước hôm nay');
check('chỉ cuối tuần', LeavePolicy::validate(['start_date' => '2026-12-05', 'end_date' => '2026-12-06'] + $ok, $today)[0], 'Khoảng thời gian đã chọn không có ngày làm việc nào (T2–T6)');
check('quá 30 ngày làm việc (05/01 → 20/02)', LeavePolicy::validate(['start_date' => '2026-01-05', 'end_date' => '2026-02-20'] + $ok, '2026-01-01')[0], 'Mỗi đơn tối đa 30 ngày làm việc');
check('lý do quá ngắn', LeavePolicy::validate(['reason' => ' a '] + $ok, $today)[0], 'Lý do cần từ 3 đến 500 ký tự');
check('lý do tiếng Việt 3 ký tự (mb_strlen)', LeavePolicy::validate(['reason' => 'Ốm!'] + $ok, $today)[0], null);

echo "\nQuy tắc kỳ lương và điều chỉnh lương\n";
$periodToday = new DateTimeImmutable('2026-11-22');
check('không tạo kỳ lương trong quá khứ', PayrollPeriodPolicy::validateCreationMonth('2026-10', $periodToday), 'Không thể tạo kỳ lương cho tháng đã qua');
check('cho tạo kỳ lương tháng hiện tại', PayrollPeriodPolicy::validateCreationMonth('2026-11', $periodToday), null);
check('cho tạo kỳ lương tương lai', PayrollPeriodPolicy::validateCreationMonth('2026-12', $periodToday), null);
check('từ chối tháng không hợp lệ', PayrollPeriodPolicy::validateCreationMonth('2026-13', $periodToday), 'month_year phải có định dạng YYYY-MM');
check('điều chỉnh lương hiệu lực tháng kế tiếp', ContractSalaryAdjustmentPolicy::effectiveMonth($periodToday), '2026-12');
check('tháng 12 chuyển hiệu lực sang tháng 1 năm sau', ContractSalaryAdjustmentPolicy::effectiveMonth(new DateTimeImmutable('2026-12-22')), '2027-01');
$salaryInput = ['base_salary' => '20000000', 'insurance_salary' => '18000000', 'allowance' => '2000000', 'dependents_count' => '1', 'reason' => 'Điều chỉnh lương'];
check('bắt buộc lý do điều chỉnh lương', ContractSalaryAdjustmentPolicy::validate(array_merge($salaryInput, ['reason' => '  ']))[0], 'Lý do cần từ 3 đến 500 ký tự');
check('chấp nhận điều chỉnh lương hợp lệ', ContractSalaryAdjustmentPolicy::validate($salaryInput)[0], null);
check('phải có thay đổi mới tạo điều chỉnh', ContractSalaryAdjustmentPolicy::hasChanges($salaryInput, $salaryInput), false);
check('điều chỉnh có thay đổi so với hiện tại', ContractSalaryAdjustmentPolicy::hasChanges($salaryInput, array_merge($salaryInput, ['base_salary' => '21000000'])), true);
check('chặn sửa lương qua form hồ sơ', ContractSalaryAdjustmentPolicy::containsCompensationFields(['base_salary' => 21000000]), true);
check('cho phép cập nhật hồ sơ không có lương', ContractSalaryAdjustmentPolicy::containsCompensationFields(['full_name' => 'Nguyễn Văn An']), false);

echo "\nPayrollEngine::calculateNetSalary\n";
// Đủ công, không OT: 20tr lương + 2tr phụ cấp, BH 10,5% trên 20tr, 0 người phụ thuộc
$r = PayrollEngine::calculateNetSalary(20_000_000, 2_000_000, 22, 22, 0, 1.5, 0);
check('gross = lương + phụ cấp', $r['gross_salary'], 22_000_000.0);
check('BHXH+BHYT+BHTN = 10,5%', $r['social_insurance'], 2_100_000.0);
// TN tính thuế = 22tr − 2,1tr − 11tr = 8,9tr → 250k + 3,9tr×10% = 640k
check('thuế TNCN lũy tiến bậc 2', $r['personal_tax'], 640_000.0);
check('net = gross − BH − thuế', $r['net_salary'], 19_260_000.0);

$r = PayrollEngine::calculateNetSalary(22_000_000, 0, 11, 22, 8, 1.5, 0);
check('nửa tháng công → lương theo tỉ lệ', $r['pro_rated_salary'], 11_000_000.0);
check('OT 8h × 1,5 × lương giờ (22tr/176h)', $r['ot_pay'], 1_500_000.0);

$r = PayrollEngine::calculateNetSalary(15_000_000, 0, 22, 22, 0, 1.5, 2, 15_000_000);
check('2 người phụ thuộc → giảm trừ 11tr + 8,8tr', $r['tax_deduction'], 19_800_000.0);
check('thu nhập dưới giảm trừ → thuế 0', $r['personal_tax'], 0.0);

$r = PayrollEngine::calculateNetSalary(18_500_000, 2_500_000, 22, 22, 8, 1.5, 1, 15_000_000);
check('mẫu NV002 tháng 10 khớp dữ liệu seed (net)', near($r['net_salary'], 20_407_727.27), true);

$r = PayrollEngine::calculateNetSalary(10_000_000, 0, 0, 0);
check('công chuẩn 0 → không chia cho 0', $r['pro_rated_salary'], 0.0);

$total = $passed + count($failed);
echo "\n" . ($failed ? "\033[31m✗ {$passed}/{$total} đạt\033[0m\n" : "\033[32m✓ {$passed}/{$total} đạt\033[0m\n");
exit($failed ? 1 : 0);
