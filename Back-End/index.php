<?php
if (!file_exists(__DIR__ . '/configs/env.php')) {
    header('Content-Type: application/json; charset=UTF-8');
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'status'  => 'error',
        'data'    => null,
        'message' => 'Thiếu Back-End/configs/env.php — hãy sao chép từ configs/env.example.php',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/configs/env.php';
require_once __DIR__ . '/configs/helper.php';

// CORS — chỉ cho phép các origin Front-End đã cấu hình.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = [
    defined('FRONTEND_ORIGIN') ? FRONTEND_ORIGIN : 'http://localhost:5173',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://localhost:5174',
];
if ($origin !== '') {
    header('Vary: Origin');
    if (in_array($origin, $allowedOrigins, true)) {
        header("Access-Control-Allow-Origin: {$origin}");
        header('Access-Control-Allow-Credentials: true');
    }
}
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'httponly' => true,
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'samesite' => 'Lax',
    ]);
    ini_set('session.use_strict_mode', '1');
    session_start();
}

spl_autoload_register(function ($class) {
    $fileName = "$class.php";

    $fileModel              = PATH_MODEL . $fileName;
    $fileController         = PATH_CONTROLLER . $fileName;

    if (file_exists($fileModel)) {
        require_once $fileModel;
    }
    else if (file_exists($fileController)) {
        require_once $fileController;
    }
});

// Điều hướng — mọi lỗi chưa bắt đều trả JSON thay vì trang lỗi HTML.
try {
    require_once __DIR__ . '/routes/index.php';
} catch (PDOException $e) {
    error_log($e->getMessage());
    json_response(500, null, 'Lỗi cơ sở dữ liệu. Vui lòng thử lại sau.');
} catch (Throwable $e) {
    error_log($e->getMessage());
    json_response(500, null, 'Lỗi máy chủ. Vui lòng thử lại sau.');
}
