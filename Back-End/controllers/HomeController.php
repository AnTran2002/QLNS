<?php

class HomeController
{
    /**
     * GET /?action=/ — Kiểm tra backend và kết nối database.
     * Dùng để thử nhanh: mở http://localhost:8000/ trên trình duyệt.
     */
    public function index()
    {
        $model = new BaseModel();
        $users = (int) $model->query('SELECT COUNT(*) FROM users')->fetchColumn();

        json_response(200, [
            'backend'  => 'ok',
            'database' => DB_NAME,
            'users'    => $users,
        ], 'Backend đang chạy và đã kết nối database');
    }
}
