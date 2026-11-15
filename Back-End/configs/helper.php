<?php

if (!function_exists('debug')) {
    function debug($data)
    {
        echo '<pre>';
        print_r($data);
        die;
    }
}

if (!function_exists('upload_file')) {
    function upload_file($folder, $file)
    {
        $targetFile = $folder . '/' . time() . '-' . $file["name"];

        if (move_uploaded_file($file["tmp_name"], PATH_ASSETS_UPLOADS . $targetFile)) {
            return $targetFile;
        }

        throw new Exception('Upload file không thành công!');
    }
}

/**
 * Trả JSON theo định dạng thống nhất của API: { success, data, message }.
 */
if (!function_exists('json_response')) {
    function json_response(int $status, $data = null, string $message = ''): void
    {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=UTF-8');
        }
        http_response_code($status);
        echo json_encode([
            'success' => $status >= 200 && $status < 300,
            'data'    => $data,
            'message' => $message,
        ], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * Đọc body JSON của request. Trả về null nếu body không phải JSON object.
 */
if (!function_exists('read_json_body')) {
    function read_json_body(): ?array
    {
        $input = json_decode(file_get_contents('php://input'), true);
        return is_array($input) ? $input : null;
    }
}

/**
 * Kiểm tra phương thức HTTP. Trả về false (và đã trả lỗi 405) nếu không hợp lệ.
 */
if (!function_exists('require_method')) {
    function require_method(string ...$methods): bool
    {
        if (in_array($_SERVER['REQUEST_METHOD'], $methods, true)) {
            return true;
        }
        header('Allow: ' . implode(', ', $methods));
        json_response(405, null, 'Phương thức không được hỗ trợ');
        return false;
    }
}

/**
 * Kiểm tra đăng nhập (và vai trò nếu truyền vào).
 * Trả về false (và đã trả lỗi 401/403) nếu không đủ quyền.
 */
if (!function_exists('require_auth')) {
    function require_auth(?string $role = null): bool
    {
        if (!isset($_SESSION['user_id'])) {
            json_response(401, null, 'Chưa đăng nhập');
            return false;
        }
        if ($role !== null && ($_SESSION['role'] ?? null) !== $role) {
            json_response(403, null, 'Không có quyền truy cập');
            return false;
        }
        return true;
    }
}
