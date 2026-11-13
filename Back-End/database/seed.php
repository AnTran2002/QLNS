<?php
/**
 * Database Seed Script
 * Run: php database/seed.php
 */

require_once __DIR__ . '/../configs/env.php';

$dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8', DB_HOST, DB_PORT, DB_NAME);

try {
    $pdo = new PDO($dsn, DB_USERNAME, DB_PASSWORD, DB_OPTIONS);
} catch (PDOException $e) {
    die("Kết nối CSDL thất bại: " . $e->getMessage() . "\n");
}

echo "=== QLNS Database Seeder ===\n\n";

$pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
$pdo->exec("TRUNCATE TABLE payroll_items");
$pdo->exec("TRUNCATE TABLE payroll_periods");
$pdo->exec("TRUNCATE TABLE contracts");
$pdo->exec("TRUNCATE TABLE users");
$pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
echo "[✓] Đã xóa dữ liệu cũ\n";

// Seed Users
$password = password_hash('123456', PASSWORD_BCRYPT);

$users = [
    ['NV001', 'Nguyễn Văn An',   'an.nguyen@company.vn',   $password, 'ADMIN'],
    ['NV002', 'Trần Thị Bình',   'binh.tran@company.vn',   $password, 'EMPLOYEE'],
    ['NV003', 'Lê Hoàng Cường',  'cuong.le@company.vn',    $password, 'EMPLOYEE'],
    ['NV004', 'Phạm Minh Đức',   'duc.pham@company.vn',    $password, 'EMPLOYEE'],
    ['NV005', 'Hoàng Thị Em',    'em.hoang@company.vn',    $password, 'EMPLOYEE'],
];

$stmtUser = $pdo->prepare(
    "INSERT INTO users (employee_code, full_name, email, password, role, created_at) VALUES (?, ?, ?, ?, ?, NOW())"
);

foreach ($users as $u) {
    $stmtUser->execute($u);
}
echo "[✓] Đã tạo " . count($users) . " users (mật khẩu: 123456)\n";

// Seed Contracts
$contracts = [
    [1, 25000000, 20000000, 1, 3000000],
    [2, 18500000, 15000000, 1, 2500000],
    [3, 18000000, 15000000, 2, 2000000],
    [4, 16000000, 13000000, 1, 1500000],
    [5, 14000000, 11000000, 0, 1000000],
];

$stmtContract = $pdo->prepare(
    "INSERT INTO contracts (user_id, base_salary, insurance_salary, dependents_count, allowance, created_at) VALUES (?, ?, ?, ?, ?, NOW())"
);

foreach ($contracts as $c) {
    $stmtContract->execute($c);
}
echo "[✓] Đã tạo " . count($contracts) . " contracts\n";

// Seed Payroll Periods
$periods = [
    ['2026-10', 22, 'LOCKED'],
    ['2026-11', 22, 'DRAFT'],
];

$stmtPeriod = $pdo->prepare(
    "INSERT INTO payroll_periods (month_year, standard_days, status, created_at) VALUES (?, ?, ?, NOW())"
);

foreach ($periods as $p) {
    $stmtPeriod->execute($p);
}
echo "[✓] Đã tạo " . count($periods) . " payroll periods\n";

// Seed Payroll Items
$payrollItems = [
    [1, 1, 22, 4,  28500000, 2100000, 11000000, 750000, 25650000],
    [1, 2, 22, 8,  21800000, 1575000, 11000000, 295000, 19930000],
    [1, 3, 21, 8,  21500000, 1575000, 11000000, 350000, 19575000],
    [1, 4, 22, 0,  17500000, 1365000, 11000000, 0,      16135000],
    [1, 5, 19, 3,  14800000, 1155000, 11000000, 0,      13645000],
];

$stmtPayroll = $pdo->prepare(
    "INSERT INTO payroll_items (period_id, user_id, actual_days, ot_hours, gross_salary, social_insurance, tax_deduction, personal_tax, net_salary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
);

foreach ($payrollItems as $pi) {
    $stmtPayroll->execute($pi);
}
echo "[✓] Đã tạo " . count($payrollItems) . " payroll items\n";

echo "\n=== Seed hoàn tất! ===\n";
echo "  Admin:    NV001 (an.nguyen@company.vn) / 123456\n";
echo "  Employee: NV002 (binh.tran@company.vn) / 123456\n";

