<?php

class ContractModel extends BaseModel
{
    protected $table = 'contracts';

    /**
     * Lấy hợp đồng theo user ID
     */
    public function findByUserId($userId)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM {$this->table} WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 1");
        $stmt->execute(['user_id' => $userId]);
        return $stmt->fetch();
    }
}

