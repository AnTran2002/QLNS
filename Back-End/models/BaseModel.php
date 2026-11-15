<?php
require_once __DIR__ . '/../configs/env.php';

class BaseModel
{
    protected static ?PDO $connection = null;
    protected $table;
    protected $db;

    public function __construct()
    {
        if (self::$connection === null) {
            $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8', DB_HOST, DB_PORT, DB_NAME);
            self::$connection = new PDO($dsn, DB_USERNAME, DB_PASSWORD, DB_OPTIONS);
        }

        $this->db = self::$connection;
    }
}
