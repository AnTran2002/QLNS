<?php
require_once __DIR__ . '/../configs/env.php';

class BaseModel
{
    protected static ?PDO $connection = null;
    protected $table;
    protected $db;

    public function __construct()
    {
        // Dùng chung 1 kết nối cho mọi model trong request → transaction trải qua nhiều model.
        if (self::$connection === null) {
            try {
                self::$connection = new PDO(
                    "mysql:host=" . DB_HOST . (defined('DB_PORT') && DB_PORT ? ";port=" . DB_PORT : "") . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                    DB_USERNAME,
                    DB_PASSWORD
                );
                self::$connection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            } catch (PDOException $exception) {
                http_response_code(500);
                echo json_encode([
                    "status" => "error",
                    "message" => "Lỗi kết nối CSDL: " . $exception->getMessage()
                ]);
                exit();
            }
        }
        $this->db = self::$connection;
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
