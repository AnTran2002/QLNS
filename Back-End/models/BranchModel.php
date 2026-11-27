<?php

class BranchModel extends BaseModel
{
    protected $table = 'branches';

    public function allActive(): array
    {
        return $this->db->query("SELECT id, code, name, address, city, region FROM branches WHERE is_active = 1 ORDER BY id")->fetchAll();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT id, code, name, address, city, region FROM branches WHERE id = ? AND is_active = 1');
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function departments(): array
    {
        return $this->db->query('SELECT name FROM departments ORDER BY name')->fetchAll(PDO::FETCH_COLUMN);
    }

    public function ensureDepartment(string $name): void
    {
        $stmt = $this->db->prepare('INSERT IGNORE INTO departments (name) VALUES (?)');
        $stmt->execute([$name]);
    }

    public function holidays(int $year): array
    {
        $stmt = $this->db->prepare('SELECT holiday_date, name FROM public_holidays WHERE YEAR(holiday_date) = ? ORDER BY holiday_date');
        $stmt->execute([$year]);
        return $stmt->fetchAll();
    }

    /** Lấy giá trị enum của 1 cột trong DB — để Front-End không cần mã cứng. */
    public function enumValues(string $table, string $column): array
    {
        $stmt = $this->db->prepare(
            'SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
        );
        $stmt->execute([$table, $column]);
        $type = (string) $stmt->fetchColumn();
        if (!preg_match('/^enum\((.*)\)$/', $type, $m)) {
            return [];
        }
        return array_map(fn ($v) => str_replace("''", "'", trim($v, "'")), str_getcsv($m[1], ',', "'", "\\"));
    }
}
