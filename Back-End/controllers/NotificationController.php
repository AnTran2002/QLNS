<?php

class NotificationController
{
    public function mine()
    {
        if (!require_method('GET') || !require_auth('EMPLOYEE')) {
            return;
        }
        $model = new NotificationModel();
        if (!$model->tableExists()) {
            return json_response(409, null, 'Chưa có bảng thông báo — hãy chạy migration 011_notifications.sql');
        }
        $userId = (int) $_SESSION['user_id'];
        $unreadOnly = ($_GET['unread'] ?? '') === '1';
        $notifications = array_map(function ($row) {
            $row['id'] = (int) $row['id'];
            return $row;
        }, $model->listForUser($userId, $unreadOnly));
        json_response(200, [
            'notifications' => $notifications,
            'unread_count' => $model->unreadCount($userId),
        ], 'Lấy thông báo thành công');
    }

    public function read()
    {
        if (!require_method('POST') || !require_auth('EMPLOYEE')) {
            return;
        }
        $input = read_json_body() ?? [];
        $id = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1],
        ]);
        $id = $id === false ? null : (int) $id;
        $model = new NotificationModel();
        $count = $model->markRead((int) $_SESSION['user_id'], $id);
        json_response(200, [
            'marked_count' => $count,
            'unread_count' => $model->unreadCount((int) $_SESSION['user_id']),
        ], $id === null ? 'Đã đánh dấu tất cả là đã đọc' : 'Đã đánh dấu thông báo là đã đọc');
    }
}
