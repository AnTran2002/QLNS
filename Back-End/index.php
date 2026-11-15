<?php
require_once __DIR__ . '/configs/env.php';
require_once __DIR__ . '/configs/helper.php';

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin === FRONTEND_ORIGIN) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

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

// Điều hướng
require_once __DIR__ . '/routes/index.php';
