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

    /**
     * Tổng hợp chấm công theo nhân viên cho tháng `YYYY-MM` → [user_id => [...]].
     * LEAVE thuộc đơn nghỉ UNPAID / SICK đã duyệt là nghỉ không hưởng lương từ công ty.
     */
    public function monthSummary(string $month): array
    {
        $hasLeave = (bool) $this->db->query("SHOW TABLES LIKE 'leave_requests'")->fetch();
        $unpaid = $hasLeave
            ? "EXISTS (SELECT 1 FROM leave_requests lr
                       WHERE lr.user_id = a.user_id AND lr.status = 'APPROVED'
                         AND lr.type IN ('UNPAID', 'SICK')
                         AND a.work_date BETWEEN lr.start_date AND lr.end_date)"
            : '0';
        // Ngày công chỉ tính T2–T6; giờ OT tính cả cuối tuần.
        $weekday = 'WEEKDAY(a.work_date) < 5';
        $stmt = $this->db->prepare(
            "SELECT t.user_id, t.present, t.late, t.remote, t.absent, t.ot_hours, t.recorded_days,
                    t.leave_days - t.unpaid_leave AS paid_leave, t.unpaid_leave,
                    t.present + t.late + t.remote + t.leave_days - t.unpaid_leave AS paid_days
             FROM (
                SELECT a.user_id,
                       SUM(a.status = 'PRESENT' AND {$weekday}) AS present,
                       SUM(a.status = 'LATE' AND {$weekday}) AS late,
                       SUM(a.status = 'REMOTE' AND {$weekday}) AS remote,
                       SUM(a.status = 'ABSENT' AND {$weekday}) AS absent,
                       SUM(a.status = 'LEAVE' AND {$weekday}) AS leave_days,
                       SUM(a.status = 'LEAVE' AND {$weekday} AND {$unpaid}) AS unpaid_leave,
                       COALESCE(SUM(a.ot_hours), 0) AS ot_hours,
                       SUM({$weekday}) AS recorded_days
                FROM {$this->table} a
                WHERE a.work_date >= :start AND a.work_date < :end
                GROUP BY a.user_id
             ) t"
        );
        $start = $month . '-01';
        $stmt->execute([
            'start' => $start,
            'end' => (new DateTimeImmutable($start))->modify('first day of next month')->format('Y-m-d'),
        ]);
        $byUser = [];
        foreach ($stmt->fetchAll() as $row) {
            $byUser[(int) $row['user_id']] = $row;
        }
        return $byUser;
    }

    /** Ngày chấm công gần nhất trong tháng `YYYY-MM`. */
    public function lastDateOfMonth(string $month): ?string
    {
        $stmt = $this->db->prepare(
            "SELECT MAX(work_date) FROM {$this->table} WHERE DATE_FORMAT(work_date, '%Y-%m') = :month"
        );
        $stmt->execute(['month' => $month]);
        $value = $stmt->fetchColumn();
        return $value ?: null;
    }
}
