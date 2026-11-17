<?php

class ContractModel extends BaseModel
{
    protected $table = 'contracts';

    /**
     * Lấy hợp đồng theo user ID
     */
    public function findByUserId($userId)
    {
        $stmt = $this->db->prepare("SELECT * FROM {$this->table} WHERE user_id = :user_id ORDER BY created_at DESC, id DESC LIMIT 1");
        $stmt->execute(['user_id' => $userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Lấy danh sách toàn bộ hợp đồng kèm thông tin nhân sự (cho UC-01)
     */
    public function getAllWithUser(): array
    {
        $sql = "SELECT c.id, c.user_id, c.base_salary, c.insurance_salary, c.allowance, c.dependents_count, c.created_at,
                       u.employee_code, u.full_name, u.email, u.department, u.position, u.status, u.role
                FROM {$this->table} c
                JOIN users u ON c.user_id = u.id
                ORDER BY c.id ASC";
        return $this->db->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Lấy chi tiết thông tin hợp đồng theo ID hợp đồng hoặc User ID (cho UC-01)
     */
    public function findByIdWithUser(int $id): ?array
    {
        // Tìm theo contract ID trước
        $stmt = $this->db->prepare(
            "SELECT c.id, c.user_id, c.base_salary, c.insurance_salary, c.allowance, c.dependents_count, c.created_at,
                    u.employee_code, u.full_name, u.email, u.department, u.position, u.status, u.role
             FROM {$this->table} c
             JOIN users u ON c.user_id = u.id
             WHERE c.id = :id
             LIMIT 1"
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return $row;
        }

        // Dự phòng tìm theo user_id nếu không tìm thấy contract id
        $stmt = $this->db->prepare(
            "SELECT c.id, c.user_id, c.base_salary, c.insurance_salary, c.allowance, c.dependents_count, c.created_at,
                    u.employee_code, u.full_name, u.email, u.department, u.position, u.status, u.role
             FROM {$this->table} c
             JOIN users u ON c.user_id = u.id
             WHERE c.user_id = :user_id
             ORDER BY c.created_at DESC, c.id DESC
             LIMIT 1"
        );
        $stmt->execute(['user_id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Cập nhật thông số hợp đồng (lương cơ bản, BHXH, phụ cấp, giảm trừ)
     */
    public function updateContract(int $id, array $data): bool
    {
        $stmt = $this->db->prepare(
            "UPDATE {$this->table}
             SET base_salary = :base_salary,
                 insurance_salary = :insurance_salary,
                 allowance = :allowance,
                 dependents_count = :dependents_count
             WHERE id = :id"
        );
        return $stmt->execute([
            'id'               => $id,
            'base_salary'      => $data['base_salary'] ?? 0,
            'insurance_salary' => $data['insurance_salary'] ?? 0,
            'allowance'        => $data['allowance'] ?? 0,
            'dependents_count' => $data['dependents_count'] ?? 0,
        ]);
    }

    /**
     * Cập nhật hợp đồng mới nhất của nhân viên; tạo mới nếu chưa có.
     */
    public function saveForUser(int $userId, array $data): void
    {
        $params = [
            'user_id'          => $userId,
            'base_salary'      => $data['base_salary'],
            'insurance_salary' => $data['insurance_salary'],
            'allowance'        => $data['allowance'],
            'dependents_count' => $data['dependents_count'],
        ];

        $current = $this->findByUserId($userId);
        if ($current) {
            $stmt = $this->db->prepare(
                "UPDATE {$this->table}
                 SET base_salary = :base_salary, insurance_salary = :insurance_salary,
                     allowance = :allowance, dependents_count = :dependents_count
                 WHERE id = :id AND user_id = :user_id"
            );
            $stmt->execute($params + ['id' => $current['id']]);
            return;
        }

        $stmt = $this->db->prepare(
            "INSERT INTO {$this->table} (user_id, base_salary, insurance_salary, allowance, dependents_count)
             VALUES (:user_id, :base_salary, :insurance_salary, :allowance, :dependents_count)"
        );
        $stmt->execute($params);
    }
}
