<?php

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit("Script này chỉ chạy bằng PHP CLI.\n");
}

require_once __DIR__ . '/../configs/env.php';
require_once __DIR__ . '/../services/PayrollEngine.php';

$apply = in_array('--apply', $argv, true);
$employees = [
    'NV001' => [
        'name' => 'Nguyễn Văn An',
        'email' => 'an.nguyen@company.vn',
        'department' => 'Nhân sự',
        'position' => 'Giám đốc nhân sự',
        'status' => 'Đang làm việc',
        'joined_at' => '2026-01-01',
        'base_salary' => 25000000,
        'insurance_salary' => 20000000,
        'allowance' => 3000000,
        'dependents_count' => 1,
        'bank_name' => 'DEMO VCB',
        'bank_account_name' => 'NGUYEN VAN AN',
        'bank_account_number' => '000000000001',
        'attendance' => [
            '2026-10' => ['actual_days' => 22, 'ot_hours' => 4],
            '2026-11' => ['actual_days' => 20, 'ot_hours' => 2],
        ],
    ],
    'NV002' => [
        'name' => 'Trần Thị Bình',
        'email' => 'binh.tran@company.vn',
        'department' => 'Thiết kế',
        'position' => 'Senior UI/UX Designer',
        'status' => 'Đang làm việc',
        'joined_at' => '2026-01-02',
        'base_salary' => 18500000,
        'insurance_salary' => 15000000,
        'allowance' => 2500000,
        'dependents_count' => 1,
        'bank_name' => 'DEMO BIDV',
        'bank_account_name' => 'TRAN THI BINH',
        'bank_account_number' => '000000000002',
        'attendance' => [
            '2026-10' => ['actual_days' => 22, 'ot_hours' => 8],
            '2026-11' => ['actual_days' => 21, 'ot_hours' => 6],
        ],
    ],
    'NV003' => [
        'name' => 'Lê Hoàng Cường',
        'email' => 'cuong.le@company.vn',
        'department' => 'Kỹ thuật',
        'position' => 'Backend Developer',
        'status' => 'Đang làm việc',
        'joined_at' => '2026-01-03',
        'base_salary' => 18000000,
        'insurance_salary' => 15000000,
        'allowance' => 2000000,
        'dependents_count' => 2,
        'bank_name' => 'DEMO VietinBank',
        'bank_account_name' => 'LE HOANG CUONG',
        'bank_account_number' => '000000000003',
        'attendance' => [
            '2026-10' => ['actual_days' => 21, 'ot_hours' => 8],
            '2026-11' => ['actual_days' => 22, 'ot_hours' => 0],
        ],
    ],
    'NV004' => [
        'name' => 'Phạm Minh Đức',
        'email' => 'duc.pham@company.vn',
        'department' => 'Kỹ thuật',
        'position' => 'Frontend Developer',
        'status' => 'Đang làm việc',
        'joined_at' => '2026-01-04',
        'base_salary' => 16000000,
        'insurance_salary' => 13000000,
        'allowance' => 1500000,
        'dependents_count' => 1,
        'bank_name' => 'DEMO MB Bank',
        'bank_account_name' => 'PHAM MINH DUC',
        'bank_account_number' => '000000000004',
        'attendance' => [
            '2026-10' => ['actual_days' => 22, 'ot_hours' => 0],
            '2026-11' => ['actual_days' => 19, 'ot_hours' => 4],
        ],
    ],
    'NV005' => [
        'name' => 'Hoàng Thị Em',
        'email' => 'em.hoang@company.vn',
        'department' => 'Kinh doanh',
        'position' => 'Sales Executive',
        'status' => 'Thử việc',
        'joined_at' => '2026-01-05',
        'base_salary' => 14000000,
        'insurance_salary' => 11000000,
        'allowance' => 1000000,
        'dependents_count' => 0,
        'bank_name' => 'DEMO Agribank',
        'bank_account_name' => 'HOANG THI EM',
        'bank_account_number' => '000000000005',
        'attendance' => [
            '2026-10' => ['actual_days' => 19, 'ot_hours' => 3],
            '2026-11' => ['actual_days' => 18, 'ot_hours' => 0],
        ],
    ],
];
$periods = [
    '2026-10' => 'PAID',
    '2026-11' => 'DRAFT',
];

try {
    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        DB_HOST,
        DB_PORT,
        DB_NAME
    );
    $pdo = new PDO($dsn, DB_USERNAME, DB_PASSWORD, DB_OPTIONS);

    $users = $pdo->query(
        'SELECT id, employee_code, full_name, email
         FROM users
         ORDER BY employee_code'
    )->fetchAll(PDO::FETCH_ASSOC);
    if (count($users) !== count($employees)) {
        throw new RuntimeException(
            'Từ chối seed: database phải chỉ có đúng 5 tài khoản mẫu NV001-NV005; không ghi đè database có dữ liệu khác.'
        );
    }

    $userIds = [];
    foreach ($users as $user) {
        $code = $user['employee_code'];
        if (!isset($employees[$code])
            || $user['full_name'] !== $employees[$code]['name']
            || $user['email'] !== $employees[$code]['email']
        ) {
            throw new RuntimeException(
                'Từ chối seed: tài khoản trong database không khớp bộ dữ liệu mẫu NV001-NV005.'
            );
        }
        $userIds[$code] = (int) $user['id'];
    }
    if (count($userIds) !== count($employees)) {
        throw new RuntimeException('Không tìm thấy đủ tài khoản mẫu NV001-NV005.');
    }

    $userColumns = $pdo->query('SHOW COLUMNS FROM users')->fetchAll(PDO::FETCH_COLUMN);
    foreach (['bank_name', 'bank_account_name', 'bank_account_number'] as $requiredColumn) {
        if (!in_array($requiredColumn, $userColumns, true)) {
            throw new RuntimeException(
                'Thiếu cột tài khoản ngân hàng. Hãy chạy migration 003_user_bank_accounts.sql trước.'
            );
        }
    }

    $contractQuery = $pdo->prepare(
        'SELECT id
         FROM contracts
         WHERE user_id = :user_id
         ORDER BY created_at DESC, id DESC
         LIMIT 1'
    );
    foreach ($userIds as $userId) {
        $contractQuery->execute(['user_id' => $userId]);
        if (!$contractQuery->fetch(PDO::FETCH_ASSOC)) {
            throw new RuntimeException("Thiếu hợp đồng lương cho user_id={$userId}.");
        }
    }

    $periodQuery = $pdo->prepare(
        'SELECT id
         FROM payroll_periods
         WHERE month_year = :month_year'
    );
    foreach ($periods as $monthYear => $status) {
        $periodQuery->execute(['month_year' => $monthYear]);
        if (count($periodQuery->fetchAll(PDO::FETCH_ASSOC)) > 1) {
            throw new RuntimeException("Có nhiều kỳ lương {$monthYear}; cần xử lý trùng trước khi seed.");
        }
    }

    echo "Database phù hợp với bộ demo NV001-NV005.\n";
    echo "Sẽ tạo/cập nhật 5 tài khoản ngân hàng, 2 kỳ lương và 10 dòng công/lương.\n";
    echo "Kỳ 2026-10: PAID; kỳ 2026-11: DRAFT; không xóa bản ghi.\n";
    if (!$apply) {
        echo "Chưa thay đổi dữ liệu. Thêm --apply để xác nhận seed bộ dữ liệu demo.\n";
        exit(0);
    }

    $pdo->beginTransaction();
    $saveBankAccount = $pdo->prepare(
        'UPDATE users
         SET department = :department,
             position = :position,
             status = :status,
             joined_at = :joined_at,
             bank_name = :bank_name,
             bank_account_name = :bank_account_name,
             bank_account_number = :bank_account_number
         WHERE id = :user_id'
    );
    $updateContract = $pdo->prepare(
        'UPDATE contracts
         SET base_salary = :base_salary,
             insurance_salary = :insurance_salary,
             allowance = :allowance,
             dependents_count = :dependents_count
         WHERE id = :id'
    );
    foreach ($employees as $code => $employee) {
        $saveBankAccount->execute([
            'user_id' => $userIds[$code],
            'department' => $employee['department'],
            'position' => $employee['position'],
            'status' => $employee['status'],
            'joined_at' => $employee['joined_at'],
            'bank_name' => $employee['bank_name'],
            'bank_account_name' => $employee['bank_account_name'],
            'bank_account_number' => $employee['bank_account_number'],
        ]);
        $contractQuery->execute(['user_id' => $userIds[$code]]);
        $contractId = $contractQuery->fetchColumn();
        $updateContract->execute([
            'id' => $contractId,
            'base_salary' => $employee['base_salary'],
            'insurance_salary' => $employee['insurance_salary'],
            'allowance' => $employee['allowance'],
            'dependents_count' => $employee['dependents_count'],
        ]);
    }

    $findPeriod = $pdo->prepare(
        'SELECT id
         FROM payroll_periods
         WHERE month_year = :month_year
         LIMIT 1'
    );
    $insertPeriod = $pdo->prepare(
        'INSERT INTO payroll_periods (month_year, standard_days, status)
         VALUES (:month_year, 22, :status)'
    );
    $updatePeriod = $pdo->prepare(
        'UPDATE payroll_periods
         SET standard_days = 22, status = :status
         WHERE id = :id'
    );
    $periodIds = [];
    foreach ($periods as $monthYear => $status) {
        $findPeriod->execute(['month_year' => $monthYear]);
        $periodId = $findPeriod->fetchColumn();
        if ($periodId === false) {
            $insertPeriod->execute([
                'month_year' => $monthYear,
                'status' => $status,
            ]);
            $periodId = $pdo->lastInsertId();
        } else {
            $updatePeriod->execute([
                'id' => $periodId,
                'status' => $status,
            ]);
        }
        $periodIds[$monthYear] = (int) $periodId;
    }

    $findContract = $pdo->prepare(
        'SELECT base_salary, insurance_salary, allowance, dependents_count
         FROM contracts
         WHERE user_id = :user_id
         ORDER BY created_at DESC, id DESC
         LIMIT 1'
    );
    $findItem = $pdo->prepare(
        'SELECT id
         FROM payroll_items
         WHERE period_id = :period_id AND user_id = :user_id'
    );
    $updateItem = $pdo->prepare(
        'UPDATE payroll_items
         SET actual_days = :actual_days,
             ot_hours = :ot_hours,
             gross_salary = :gross_salary,
             social_insurance = :social_insurance,
             tax_deduction = :tax_deduction,
             personal_tax = :personal_tax,
             net_salary = :net_salary
         WHERE id = :id'
    );
    $insertItem = $pdo->prepare(
        'INSERT INTO payroll_items
            (period_id, user_id, actual_days, ot_hours, gross_salary,
             social_insurance, tax_deduction, personal_tax, net_salary)
         VALUES
            (:period_id, :user_id, :actual_days, :ot_hours, :gross_salary,
             :social_insurance, :tax_deduction, :personal_tax, :net_salary)'
    );

    foreach ($employees as $code => $employee) {
        $userId = $userIds[$code];
        $findContract->execute(['user_id' => $userId]);
        $contract = $findContract->fetch(PDO::FETCH_ASSOC);
        if (!$contract) {
            throw new RuntimeException("Thiếu hợp đồng lương cho {$code}.");
        }

        foreach ($employee['attendance'] as $monthYear => $attendance) {
            $calculation = PayrollEngine::calculateNetSalary(
                (float) $contract['base_salary'],
                (float) $contract['allowance'],
                (float) $attendance['actual_days'],
                22,
                (float) $attendance['ot_hours'],
                1.5,
                (int) $contract['dependents_count'],
                (float) $contract['insurance_salary']
            );
            $values = [
                'actual_days' => $attendance['actual_days'],
                'ot_hours' => $attendance['ot_hours'],
                'gross_salary' => $calculation['gross_salary'],
                'social_insurance' => $calculation['social_insurance'],
                'tax_deduction' => $calculation['tax_deduction'],
                'personal_tax' => $calculation['personal_tax'],
                'net_salary' => $calculation['net_salary'],
            ];
            $findItem->execute([
                'period_id' => $periodIds[$monthYear],
                'user_id' => $userId,
            ]);
            $itemIds = $findItem->fetchAll(PDO::FETCH_COLUMN);
            if (count($itemIds) > 1) {
                throw new RuntimeException("Có dòng lương trùng cho {$code}, kỳ {$monthYear}.");
            }

            if ($itemIds !== []) {
                $updateItem->execute($values + ['id' => (int) $itemIds[0]]);
            } else {
                $insertItem->execute($values + [
                    'period_id' => $periodIds[$monthYear],
                    'user_id' => $userId,
                ]);
            }
        }
    }

    $pdo->commit();
    echo "Đã seed thành công: 5 users, 5 contracts đã được xác nhận, 2 kỳ lương, 10 dòng lương và 5 tài khoản ngân hàng mẫu.\n";
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fwrite(STDERR, 'Seed thất bại: ' . $e->getMessage() . "\n");
    exit(1);
}
