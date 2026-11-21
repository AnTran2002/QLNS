<?php

/**
 * Hợp đồng lao động là văn bản cố định: không UPDATE.
 * Mỗi lần điều chỉnh lương = 1 phụ lục mới (1 dòng mới) kèm lý do; dòng mới nhất là điều khoản đang hiệu lực.
 */
class ContractModel extends BaseModel
{
    protected $table = 'contracts';

    public const INITIAL_REASON = 'Ký hợp đồng lao động';

    private const COLUMNS = 'c.id, c.user_id, c.base_salary, c.insurance_salary, c.allowance, c.dependents_count,
                             c.change_reason, c.created_at';
    private const USER_COLUMNS = 'u.employee_code, u.full_name, u.email, u.department, u.position, u.status, u.role, u.joined_at';

    private static bool $schemaChecked = false;

    public function __construct()
    {
        parent::__construct();
        $this->ensureReasonColumn();
    }

    /** CSDL cũ chưa có cột change_reason → tự bổ sung (idempotent, không cần file migration mới). */
    private function ensureReasonColumn(): void
    {
        if (self::$schemaChecked) {
            return;
        }
        $exists = $this->db->query("SHOW COLUMNS FROM {$this->table} LIKE 'change_reason'")->fetch();
        if (!$exists && !$this->db->inTransaction()) {
            $this->db->exec(
                "ALTER TABLE {$this->table}
                 ADD COLUMN change_reason varchar(500) NULL COMMENT 'Lý do ký / điều chỉnh (phụ lục hợp đồng)' AFTER allowance"
            );
            $exists = true;
        }
        self::$schemaChecked = (bool) $exists;
    }

    /** Hợp đồng (phiên bản) đang hiệu lực của nhân viên. */
    public function findByUserId($userId)
    {
        $stmt = $this->db->prepare("SELECT * FROM {$this->table} WHERE user_id = :user_id ORDER BY created_at DESC, id DESC LIMIT 1");
        $stmt->execute(['user_id' => $userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /** Hợp đồng đang hiệu lực của mọi nhân viên, kèm số phiên bản. */
    public function getAllWithUser(): array
    {
        $sql = "SELECT " . self::COLUMNS . ", " . self::USER_COLUMNS . ",
                       (SELECT COUNT(*) FROM {$this->table} c3 WHERE c3.user_id = c.user_id) AS version_count
                FROM {$this->table} c
                JOIN users u ON c.user_id = u.id
                WHERE c.id = (SELECT c2.id FROM {$this->table} c2 WHERE c2.user_id = c.user_id
                              ORDER BY c2.created_at DESC, c2.id DESC LIMIT 1)
                ORDER BY u.id ASC";
        return $this->db->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    }

    /** Chi tiết theo id hợp đồng (dự phòng: theo user_id) kèm lịch sử các phiên bản của nhân viên đó. */
    public function findByIdWithUser(int $id): ?array
    {
        $select = "SELECT " . self::COLUMNS . ", " . self::USER_COLUMNS . "
                   FROM {$this->table} c JOIN users u ON c.user_id = u.id";

        $stmt = $this->db->prepare("{$select} WHERE c.id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            $stmt = $this->db->prepare("{$select} WHERE c.user_id = :user_id ORDER BY c.created_at DESC, c.id DESC LIMIT 1");
            $stmt->execute(['user_id' => $id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        if (!$row) {
            return null;
        }

        $row['history'] = $this->historyByUser((int) $row['user_id']);
        return $row;
    }

    /** Toàn bộ phiên bản hợp đồng của nhân viên, mới nhất trước. */
    public function historyByUser(int $userId): array
    {
        $stmt = $this->db->prepare(
            "SELECT id, base_salary, insurance_salary, allowance, dependents_count, change_reason, created_at
             FROM {$this->table} WHERE user_id = :user_id
             ORDER BY created_at DESC, id DESC"
        );
        $stmt->execute(['user_id' => $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /** true khi điều khoản lương khác phiên bản đang hiệu lực (hoặc chưa có hợp đồng). */
    public static function termsDiffer(?array $current, array $data): bool
    {
        if (!$current) {
            return true;
        }
        foreach (['base_salary', 'insurance_salary', 'allowance'] as $key) {
            if (abs((float) $current[$key] - (float) $data[$key]) >= 0.005) {
                return true;
            }
        }
        return (int) $current['dependents_count'] !== (int) $data['dependents_count'];
    }

    /** Thêm 1 phiên bản hợp đồng mới (ký mới hoặc phụ lục điều chỉnh) — không bao giờ sửa phiên bản cũ. */
    public function createVersion(int $userId, array $data, string $reason): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO {$this->table} (user_id, base_salary, insurance_salary, allowance, dependents_count, change_reason)
             VALUES (:user_id, :base_salary, :insurance_salary, :allowance, :dependents_count, :change_reason)"
        );
        $stmt->execute([
            'user_id'          => $userId,
            'base_salary'      => $data['base_salary'],
            'insurance_salary' => $data['insurance_salary'],
            'allowance'        => $data['allowance'],
            'dependents_count' => $data['dependents_count'],
            'change_reason'    => $reason,
        ]);
        return (int) $this->db->lastInsertId();
    }
}
