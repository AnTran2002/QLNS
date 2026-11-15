<?php

require_once __DIR__ . '/../configs/env.php';

$dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
$pdo = new PDO($dsn, DB_USERNAME, DB_PASSWORD, DB_OPTIONS);

$sampleEmployeeCodes = ['NV001', 'NV002', 'NV003', 'NV004', 'NV005'];
$placeholders = implode(', ', array_fill(0, count($sampleEmployeeCodes), '?'));

$accountCheck = $pdo->prepare(
    "SELECT COUNT(*) FROM users WHERE employee_code IN ({$placeholders})"
);
$accountCheck->execute($sampleEmployeeCodes);

if ((int) $accountCheck->fetchColumn() === 0) {
    throw new RuntimeException('Không tìm thấy tài khoản mẫu. Hãy import QLNS-Database.sql trước.');
}

$passwordHash = password_hash('123456', PASSWORD_DEFAULT);

$update = $pdo->prepare(
    "UPDATE users
     SET password = ?
     WHERE employee_code IN ({$placeholders})
       AND password = ?"
);
$update->execute(array_merge(
    [$passwordHash],
    $sampleEmployeeCodes,
    ['__PASSWORD_HASH_PENDING__']
));

if ($update->rowCount() > 0) {
    echo "Đã thiết lập mật khẩu 123456 cho {$update->rowCount()} tài khoản mẫu.\n";
} else {
    echo "Mật khẩu tài khoản mẫu đã được thiết lập; không có dữ liệu cần cập nhật.\n";
}
