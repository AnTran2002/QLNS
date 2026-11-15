<?php
if (!is_readable(__DIR__ . '/configs/env.php')) {
    header('Content-Type: application/json; charset=UTF-8');
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'data'    => null,
        'message' => 'Thiếu Back-End/configs/env.php — hãy sao chép từ configs/env.example.php',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/configs/env.php';
require_once __DIR__ . '/configs/helper.php';

// CORS — chỉ cần khi Front-End gọi thẳng backend (khác origin). Khi đi qua proxy của Vite thì không dùng tới.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (defined('FRONTEND_ORIGIN') && $origin === FRONTEND_ORIGIN) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

session_start();

spl_autoload_register(function ($class) {
    $fileName = "$class.php";

    $fileModel              = PATH_MODEL . $fileName;
    $fileController         = PATH_CONTROLLER . $fileName;

    if (is_readable($fileModel)) {
        require_once $fileModel;
    }
    else if (is_readable($fileController)) {
        require_once $fileController;
    }
});

// Điều hướng — mọi lỗi chưa bắt đều trả JSON thay vì trang lỗi HTML.
try {
    require_once __DIR__ . '/routes/index.php';
} catch (PDOException $e) {
    error_log($e->getMessage());
    json_response(500, null, 'Lỗi cơ sở dữ liệu: ' . $e->getMessage());
} catch (Throwable $e) {
    error_log($e->getMessage());
    json_response(500, null, 'Lỗi máy chủ: ' . $e->getMessage());
}
