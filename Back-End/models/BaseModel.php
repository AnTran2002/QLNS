<?php
require_once __DIR__ . '/../configs/env.php';

class BaseModel
{
    protected static ?PDO $connection = null;
    protected $table;
    protected PDO $db;

    public function __construct()
    {
        if (self::$connection === null) {
            self::$connection = new PDO(
                "mysql:host=" . DB_HOST . (defined('DB_PORT') && DB_PORT ? ";port=" . DB_PORT : "") . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USERNAME,
                DB_PASSWORD,
                defined('DB_OPTIONS') ? DB_OPTIONS : []
            );
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
