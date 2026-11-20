<?php

/**
 * Chấm công theo ngày (bảng attendance_records — migration 004).
 */
class AttendanceRecordModel extends BaseModel
{
    protected $table = 'attendance_records';

    /** true khi bảng đã tồn tại (đã chạy migration 004). */
    public function tableExists(): bool
    {
        $stmt = $this->db->query("SHOW TABLES LIKE 'attendance_records'");
        return (bool) $stmt->fetch();
    }

    /** Các ngày chấm công của 1 nhân viên trong tháng `YYYY-MM`. */
    public function findByUserAndMonth(int $userId, string $month): array
    {
        $stmt = $this->db->prepare(
            "SELECT id, work_date, shift, shift_start, shift_end, check_in, check_out,
                    status, work_hours, ot_hours, note
             FROM {$this->table}
             WHERE user_id = :user_id AND DATE_FORMAT(work_date, '%Y-%m') = :month
             ORDER BY work_date ASC"
        );
        $stmt->execute(['user_id' => $userId, 'month' => $month]);
        return $stmt->fetchAll();
    }

    /** Danh sách tháng có dữ liệu (mới nhất trước) — cho bộ chọn tháng. */
    public function monthsByUser(int $userId): array
    {
        $stmt = $this->db->prepare(
            "SELECT DATE_FORMAT(work_date, '%Y-%m') AS month
             FROM {$this->table}
             WHERE user_id = :user_id
             GROUP BY month
             ORDER BY month DESC"
        );
        $stmt->execute(['user_id' => $userId]);
        return array_column($stmt->fetchAll(), 'month');
    }
}
