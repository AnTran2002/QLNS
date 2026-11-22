<?php

require_once __DIR__ . '/SalaryAdjustmentSql.php';

class ContractModel extends BaseModel
{
    protected $table = 'contracts';

    /**
     * Lấy hợp đồng theo user ID
     */
    public function findByUserId($userId)
    {
        $sql = "SELECT c.id, c.user_id, " . SalaryAdjustmentSql::selectedFields() . ", c.created_at
                FROM {$this->table} c
                " . SalaryAdjustmentSql::effectiveJoin() . "
                WHERE c.user_id = :user_id
                ORDER BY c.created_at DESC, c.id DESC
                LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['user_id' => $userId, 'effective_month' => date('Y-m')]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Lấy danh sách toàn bộ hợp đồng kèm thông tin nhân sự (cho UC-01)
     */
    public function getAllWithUser(): array
    {
        $sql = "SELECT c.id, c.user_id, " . SalaryAdjustmentSql::selectedFields() . ", c.created_at,
                       u.employee_code, u.full_name, u.email, u.department, u.position, u.status, u.role
                FROM {$this->table} c
                " . SalaryAdjustmentSql::effectiveJoin() . "
                JOIN users u ON c.user_id = u.id
                ORDER BY c.id ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['effective_month' => date('Y-m')]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Lấy chi tiết thông tin hợp đồng theo ID hợp đồng hoặc User ID (cho UC-01)
     */
    public function findByIdWithUser(int $id): ?array
    {
        // Tìm theo contract ID trước
        $stmt = $this->db->prepare(
            "SELECT c.id, c.user_id, " . SalaryAdjustmentSql::selectedFields() . ", c.created_at,
                    u.employee_code, u.full_name, u.email, u.department, u.position, u.status, u.role
             FROM {$this->table} c
             " . SalaryAdjustmentSql::effectiveJoin() . "
             JOIN users u ON c.user_id = u.id
             WHERE c.id = :id
             LIMIT 1"
        );
        $stmt->execute(['id' => $id, 'effective_month' => date('Y-m')]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return $row;
        }

        // Dự phòng tìm theo user_id nếu không tìm thấy contract id
        $stmt = $this->db->prepare(
            "SELECT c.id, c.user_id, " . SalaryAdjustmentSql::selectedFields() . ", c.created_at,
                    u.employee_code, u.full_name, u.email, u.department, u.position, u.status, u.role
             FROM {$this->table} c
             " . SalaryAdjustmentSql::effectiveJoin() . "
             JOIN users u ON c.user_id = u.id
             WHERE c.user_id = :user_id
             ORDER BY c.created_at DESC, c.id DESC
             LIMIT 1"
        );
        $stmt->execute(['user_id' => $id, 'effective_month' => date('Y-m')]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Lưu thông số hợp đồng ban đầu khi tạo nhân viên.
     */
    public function createForUser(int $userId, array $data): void
    {
        $stmt = $this->db->prepare(
            "INSERT INTO {$this->table} (user_id, base_salary, insurance_salary, allowance, dependents_count)
             VALUES (:user_id, :base_salary, :insurance_salary, :allowance, :dependents_count)"
        );
        $stmt->execute([
            'user_id'          => $userId,
            'base_salary'      => $data['base_salary'],
            'insurance_salary' => $data['insurance_salary'],
            'allowance'        => $data['allowance'],
            'dependents_count' => $data['dependents_count'],
        ]);
    }
}
