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

echo "\nPayrollEngine::calculateNetSalary\n";
// Đủ công, không OT: 20tr lương + 2tr phụ cấp, BH 10,5% trên 20tr, 0 người phụ thuộc
$r = PayrollEngine::calculateNetSalary(20_000_000, 2_000_000, 22, 22, 0, 1.5, 0);
check('gross = lương + phụ cấp', $r['gross_salary'], 22_000_000.0);
check('BHXH+BHYT+BHTN = 10,5%', $r['social_insurance'], 2_100_000.0);
// 2026: TN tính thuế = 22tr − 2,1tr − 15,5tr = 4,4tr → bậc 1: 5% = 220k
check('thuế TNCN 2026 bậc 1 (giảm trừ 15,5tr)', $r['personal_tax'], 220_000.0);
check('net = gross − BH − thuế', $r['net_salary'], 19_680_000.0);

$r = PayrollEngine::calculateNetSalary(22_000_000, 0, 11, 22, 8, 1.5, 0);
check('nửa tháng công → lương theo tỉ lệ', $r['pro_rated_salary'], 11_000_000.0);
check('OT 8h × 1,5 × lương giờ (22tr/176h)', $r['ot_pay'], 1_500_000.0);
check('phần OT trả thêm 0,5 được miễn thuế', $r['ot_tax_exempt'], 500_000.0);

$r = PayrollEngine::calculateNetSalary(15_000_000, 0, 22, 22, 0, 1.5, 2, 15_000_000);
check('2 người phụ thuộc → giảm trừ 15,5tr + 2 × 6,2tr', $r['tax_deduction'], 27_900_000.0);
check('thu nhập dưới giảm trừ → thuế 0', $r['personal_tax'], 0.0);
check('thu nhập tính thuế không âm', $r['taxable_income'], 0.0);

$r = PayrollEngine::calculateNetSalary(60_000_000, 0, 22, 22, 0, 1.5, 0);
// 60tr − 6,3tr BH − 15,5tr = 38,2tr → 0,5tr + 2tr + 8,2tr × 20% = 4,14tr
check('lương 60tr → bậc 3 (20%)', $r['personal_tax'], 4_140_000.0);

echo "\nPayrollEngine::calculateProgressiveTax (biểu 5 bậc, Luật 109/2025/QH15)\n";
check('10tr → 500k (5%)', PayrollEngine::calculateProgressiveTax(10_000_000), 500_000.0);
check('30tr → 2,5tr', PayrollEngine::calculateProgressiveTax(30_000_000), 2_500_000.0);
check('60tr → 8,5tr', PayrollEngine::calculateProgressiveTax(60_000_000), 8_500_000.0);
check('100tr → 20,5tr', PayrollEngine::calculateProgressiveTax(100_000_000), 20_500_000.0);
check('120tr → 27,5tr (35%)', PayrollEngine::calculateProgressiveTax(120_000_000), 27_500_000.0);
check('0 → 0', PayrollEngine::calculateProgressiveTax(0), 0);

echo "\nPayrollEngine::taxableIncomeFromTax / taxBreakdown (diễn giải phiếu lương)\n";
check('thuế 220k → TN tính thuế 4,4tr', PayrollEngine::taxableIncomeFromTax(220_000), 4_400_000.0);
check('thuế 4,14tr → 38,2tr', PayrollEngine::taxableIncomeFromTax(4_140_000), 38_200_000.0);
check('thuế 27,5tr → 120tr (bậc 5)', PayrollEngine::taxableIncomeFromTax(27_500_000), 120_000_000.0);
check('thuế 0 → 0', PayrollEngine::taxableIncomeFromTax(0), 0.0);
$b = PayrollEngine::taxBreakdown(['tax_deduction' => 27_900_000, 'personal_tax' => 0]);
check('giảm trừ 27,9tr → 2 người phụ thuộc', $b['dependents_count'], 2);
$r = PayrollEngine::calculateNetSalary(40_000_000, 3_000_000, 22, 22, 10, 1.5, 1, 30_000_000);
check('khứ hồi: thuế → TN tính thuế khớp engine', near(PayrollEngine::taxableIncomeFromTax($r['personal_tax']), $r['taxable_income'], 1.0), true);

$r = PayrollEngine::calculateNetSalary(10_000_000, 0, 0, 0);
check('công chuẩn 0 → không chia cho 0', $r['pro_rated_salary'], 0.0);

$total = $passed + count($failed);
echo "\n" . ($failed ? "\033[31m✗ {$passed}/{$total} đạt\033[0m\n" : "\033[32m✓ {$passed}/{$total} đạt\033[0m\n");
exit($failed ? 1 : 0);
