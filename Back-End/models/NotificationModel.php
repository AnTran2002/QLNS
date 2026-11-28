<?php

class NotificationModel extends BaseModel
{
    protected $table = 'notifications';

    public function tableExists(): bool
    {
        $stmt = $this->db->query("SHOW TABLES LIKE 'notifications'");
        return (bool) $stmt->fetch();
    }

    public function createForUser(int $userId, string $type, string $title, string $message, ?string $link = null): void
    {
        if (!$this->tableExists()) {
            return;
        }
        $stmt = $this->db->prepare(
            "INSERT INTO notifications (user_id, type, title, message, link)
             VALUES (:user_id, :type, :title, :message, :link)"
        );
        $stmt->execute([
            'user_id' => $userId,
            'type' => mb_substr($type, 0, 50),
            'title' => mb_substr($title, 0, 150),
            'message' => mb_substr($message, 0, 1000),
            'link' => $link,
        ]);
    }

    public function listForUser(int $userId, bool $unreadOnly = false): array
    {
        $sql = "SELECT id, type, title, message, link, read_at, created_at
                FROM notifications
                WHERE user_id = :user_id";
        if ($unreadOnly) {
            $sql .= " AND read_at IS NULL";
        }
        $sql .= " ORDER BY created_at DESC, id DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['user_id' => $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function unreadCount(int $userId): int
    {
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) FROM notifications WHERE user_id = :user_id AND read_at IS NULL"
        );
        $stmt->execute(['user_id' => $userId]);
        return (int) $stmt->fetchColumn();
    }

    public function markRead(int $userId, ?int $notificationId = null): int
    {
        if ($notificationId !== null) {
            $stmt = $this->db->prepare(
                "UPDATE notifications SET read_at = NOW()
                 WHERE id = :id AND user_id = :user_id AND read_at IS NULL"
            );
            $stmt->execute(['id' => $notificationId, 'user_id' => $userId]);
        } else {
            $stmt = $this->db->prepare(
                "UPDATE notifications SET read_at = NOW()
                 WHERE user_id = :user_id AND read_at IS NULL"
            );
            $stmt->execute(['user_id' => $userId]);
        }
        return $stmt->rowCount();
    }
}
