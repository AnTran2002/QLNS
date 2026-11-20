<?php

/**
 * Hồ sơ của chính người đang đăng nhập (ADMIN hoặc EMPLOYEE).
 */
class ProfileController
{
    /** Giới hạn sau khi giải mã base64 — Front-End đã thu nhỏ ảnh về 320×320. */
    private const MAX_AVATAR_BYTES = 400 * 1024;
    private const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

    /**
     * POST ?action=profile/avatar — body JSON { avatar: "data:image/jpeg;base64,..." | null }.
     * null = xoá ảnh, quay về chữ cái viết tắt.
     */
    public function updateAvatar()
    {
        if (!require_method('POST') || !require_auth()) {
            return;
        }

        $userModel = new UserModel();
        if (!$userModel->hasAvatarColumn()) {
            return json_response(409, null, 'Database chưa có cột avatar — hãy chạy migration 004_avatar_daily_attendance.sql');
        }

        $input = read_json_body();
        if ($input === null || !array_key_exists('avatar', $input)) {
            return json_response(422, null, 'Thiếu trường avatar');
        }

        $avatar = $input['avatar'];
        if ($avatar !== null) {
            if (!is_string($avatar) || !preg_match('#^data:(image/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$#', $avatar, $m)) {
                return json_response(422, null, 'Ảnh phải là JPEG, PNG hoặc WebP');
            }
            $bytes = base64_decode($m[2], true);
            if ($bytes === false || strlen($bytes) === 0) {
                return json_response(422, null, 'Dữ liệu ảnh không hợp lệ');
            }
            if (strlen($bytes) > self::MAX_AVATAR_BYTES) {
                return json_response(413, null, 'Ảnh quá lớn (tối đa 400 KB sau khi nén)');
            }
            $info = @getimagesizefromstring($bytes);
            if (!$info || !in_array($info['mime'], self::ALLOWED_MIME, true) || $info['mime'] !== $m[1]) {
                return json_response(422, null, 'Tệp tải lên không phải ảnh hợp lệ');
            }
        }

        $userId = (int) $_SESSION['user_id'];
        $userModel->updateAvatar($userId, $avatar);

        json_response(200, ['avatar' => $avatar], $avatar === null ? 'Đã xoá ảnh đại diện' : 'Đã cập nhật ảnh đại diện');
    }
}
