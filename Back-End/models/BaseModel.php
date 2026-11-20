<?php
require_once __DIR__ . '/../configs/env.php';

class BaseModel
{
    protected static ?PDO $connection = null;
    protected $table;
    protected $db;

    public function __construct()
    {
        $this->db = null;
        try {
            $this->db = new PDO(
                "mysql:host=" . DB_HOST . (defined('DB_PORT') && DB_PORT ? ";port=" . DB_PORT : "") . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USERNAME, 
                DB_PASSWORD
            );
            $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch(PDOException $exception) {
            http_response_code(500);
            echo json_encode([
                "status" => "error", 
                "message" => "Lỗi kết nối CSDL: " . $exception->getMessage()
            ]);
            exit();
        }
    }

    public function query(string $sql): PDOStatement
    {
        return $this->db->query($sql);
    }

    public function beginTransaction(): void
    {
        $this->db->beginTransaction();
    }

    public function commit(): void
    {
        $this->db->commit();
    }

    public function rollBack(): void
    {
        if ($this->db->inTransaction()) {
            $this->db->rollBack();
        }
    }
}
