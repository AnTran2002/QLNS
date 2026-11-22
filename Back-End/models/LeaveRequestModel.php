<?php

/**
 * Đơn nghỉ phép (bảng leave_requests — migration 005).
 */
class LeaveRequestModel extends BaseModel
{
    protected $table = 'leave_requests';

    private const SELECT = "SELECT l.id, l.user_id, l.type, l.start_date, l.end_date, l.days, l.reason, l.status,
                                   l.review_note, l.reviewed_at, l.created_at,
                                   u.employee_code, u.full_name, u.department, u.position,
                                   r.full_name AS reviewer_name
                            FROM leave_requests l
                            JOIN users u ON u.id = l.user_id
                            LEFT JOIN users r ON r.id = l.reviewer_id";

    public function tableExists(): bool
    {
        return (bool) $this->db->query("SHOW TABLES LIKE 'leave_requests'")->fetch();
    }

    public function findByUser(int $userId): array
    {
        $stmt = $this->db->prepare(self::SELECT . " WHERE l.user_id = :uid ORDER BY l.start_date DESC, l.id DESC");
        $stmt->execute(['uid' => $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /** Toàn bộ đơn (ADMIN); đơn chờ duyệt lên đầu, sắp theo ngày nghỉ gần nhất. */
    public function findAll(?string $status = null): array
    {
        $where  = $status ? ' WHERE l.status = :status' : '';
        $stmt = $this->db->prepare(self::SELECT . $where . " ORDER BY l.status = 'PENDING' DESC, l.start_date ASC, l.id DESC");
        $stmt->execute($status ? ['status' => $status] : []);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare(self::SELECT . ' WHERE l.id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /** Đếm đơn chờ duyệt / đã duyệt của nhân viên trùng khoảng ngày. */
    public function hasOverlap(int $userId, string $start, string $end): bool
    {
        $stmt = $this->db->prepare(
            "SELECT 1 FROM {$this->table}
             WHERE user_id = :uid AND status IN ('PENDING','APPROVED')
               AND start_date <= :end AND end_date >= :start
             LIMIT 1"
        );
        $stmt->execute(['uid' => $userId, 'start' => $start, 'end' => $end]);
        return (bool) $stmt->fetch();
    }

    /** Số ngày phép năm đã duyệt / đang chờ trong năm. */
    public function annualUsage(int $userId, int $year): array
    {
        $stmt = $this->db->prepare(
            "SELECT status, COALESCE(SUM(days), 0) AS total FROM {$this->table}
             WHERE user_id = :uid AND type = 'ANNUAL' AND YEAR(start_date) = :y AND status IN ('PENDING','APPROVED')
             GROUP BY status"
        );
        $stmt->execute(['uid' => $userId, 'y' => $year]);
        $rows = array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'total', 'status');
        return ['used' => (float) ($rows['APPROVED'] ?? 0), 'pending' => (float) ($rows['PENDING'] ?? 0)];
    }

    public function create(int $userId, array $data, int $days): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO {$this->table} (user_id, type, start_date, end_date, days, reason)
             VALUES (:uid, :type, :start, :end, :days, :reason)"
        );
        $stmt->execute([
            'uid'    => $userId,
            'type'   => $data['type'],
            'start'  => $data['start_date'],
            'end'    => $data['end_date'],
            'days'   => $days,
            'reason' => trim($data['reason']),
        ]);
        return (int) $this->db->lastInsertId();
    }

    /** Chỉ đổi khi đơn còn PENDING — trả false nếu đơn đã được xử lý trước đó. */
    public function setStatus(int $id, string $status, ?int $reviewerId = null, ?string $note = null): bool
    {
        $stmt = $this->db->prepare(
            "UPDATE {$this->table}
             SET status = :status, reviewer_id = :rid, review_note = :note,
                 reviewed_at = IF(:reviewed = 1, NOW(), reviewed_at)
             WHERE id = :id AND status = 'PENDING'"
        );
        $stmt->execute([
            'status'   => $status,
            'rid'      => $reviewerId,
            'note'     => $note,
            'reviewed' => $reviewerId ? 1 : 0,
            'id'       => $id,
        ]);
        return $stmt->rowCount() === 1;
    }

    /** Ghi các ngày nghỉ đã duyệt vào lịch chấm công (nếu đã có bảng attendance_records — migration 004). */
    public function markAttendance(int $userId, array $dates, string $note): void
    {
        if (!$dates || !$this->db->query("SHOW TABLES LIKE 'attendance_records'")->fetch()) {
            return;
        }
        $stmt = $this->db->prepare(
            "INSERT INTO attendance_records (user_id, work_date, check_in, check_out, status, work_hours, ot_hours, note)
             VALUES (:uid, :d, NULL, NULL, 'LEAVE', 0, 0, :note)
             ON DUPLICATE KEY UPDATE check_in = NULL, check_out = NULL, status = 'LEAVE', work_hours = 0, ot_hours = 0, note = VALUES(note)"
        );
        foreach ($dates as $d) {
            $stmt->execute(['uid' => $userId, 'd' => $d, 'note' => $note]);
        }
    }
}
