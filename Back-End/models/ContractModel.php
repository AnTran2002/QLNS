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
