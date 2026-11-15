<?php
/**
 * Mẫu cấu hình môi trường.
 * Sao chép file này thành `env.php` (cùng thư mục) rồi sửa thông số cho máy của bạn.
 * `env.php` đã được .gitignore — không commit mật khẩu database.
 */

// ===== Kết nối MySQL (xem trong phpMyAdmin / MAMP / XAMPP) =====
// MAMP mặc định:  host 127.0.0.1, port 8889, user root, mật khẩu root
// XAMPP mặc định: host 127.0.0.1, port 3306, user root, mật khẩu rỗng ''
define('DB_HOST', '127.0.0.1');
define('DB_PORT', '8889');
define('DB_NAME', 'qlns');
define('DB_USERNAME', 'root');
define('DB_PASSWORD', 'root');
define('DB_OPTIONS', [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
]);

// ===== Front-End được phép gọi API (CORS) =====
// Chỉ cần khi Front-End gọi thẳng backend (không qua proxy của Vite).
define('FRONTEND_ORIGIN', 'http://localhost:5173');

// ===== Đường dẫn nội bộ =====
define('PATH_ROOT', dirname(__DIR__) . '/');
define('PATH_CONTROLLER', PATH_ROOT . 'controllers/');
define('PATH_MODEL', PATH_ROOT . 'models/');
define('PATH_VIEW', PATH_ROOT . 'views/');
define('PATH_ASSETS_UPLOADS', PATH_ROOT . 'assets/uploads/');
