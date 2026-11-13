<?php

class UserModel extends BaseModel
{
    protected $table = 'users';

    /**
     * Tìm user theo email hoặc mã nhân viên (employee_code)
     */
    public function findByCodeOrEmail($identifier)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM {$this->table} WHERE employee_code = :id OR email = :id LIMIT 1");
        $stmt->execute(['id' => $identifier]);
        return $stmt->fetch();
    }

    /**
     * Tìm user theo email
     */
    public function findByEmail($email)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM {$this->table} WHERE email = :email LIMIT 1");
        $stmt->execute(['email' => $email]);
        return $stmt->fetch();
    }

    /**
     * Tìm user theo ID
     */
    public function findById($id)
    {
        $stmt = $this->pdo->prepare("SELECT id, employee_code, full_name, email, role, created_at FROM {$this->table} WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    /**
     * Lấy tất cả users (cho admin)
     */
    public function getAll()
    {
        $stmt = $this->pdo->query("SELECT id, employee_code, full_name, email, role, created_at FROM {$this->table} ORDER BY id ASC");
        return $stmt->fetchAll();
    }
}

