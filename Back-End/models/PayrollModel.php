<?php
require_once __DIR__ . '/BaseModel.php';

class PayrollModel extends BaseModel {
    protected $table = 'payroll_items';

    public function getAllPeriods()
    {
        $sql = "SELECT pp.id, pp.month_year, pp.standard_days, pp.status,
                       COUNT(pi.id) AS items_count,
                       COALESCE(SUM(pi.gross_salary), 0) AS total_gross,
                       COALESCE(SUM(pi.net_salary), 0) AS total_net
                FROM payroll_periods pp
                LEFT JOIN payroll_items pi ON pi.period_id = pp.id
                GROUP BY pp.id, pp.month_year, pp.standard_days, pp.status
                ORDER BY pp.month_year DESC";
        return $this->db->query($sql)->fetchAll();
    }

    public function createPeriod(string $monthYear, int $standardDays): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO payroll_periods (month_year, standard_days, status)
             VALUES (:month_year, :standard_days, 'DRAFT')"
        );
        $stmt->execute([
            'month_year' => $monthYear,
            'standard_days' => $standardDays,
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function getAttendanceRows(int $periodId): array
    {
        $stmt = $this->db->prepare(
            "SELECT u.id AS user_id, u.employee_code, u.full_name, u.department, u.status AS employee_status,
                    c.base_salary, c.insurance_salary, c.allowance, c.dependents_count,
                    pi.id AS payroll_item_id, COALESCE(pi.actual_days, 0) AS actual_days,
                    COALESCE(pi.ot_hours, 0) AS ot_hours,
                    COALESCE(pi.gross_salary, 0) AS gross_salary,
                    COALESCE(pi.social_insurance, 0) AS social_insurance,
                    COALESCE(pi.tax_deduction, 0) AS tax_deduction,
                    COALESCE(pi.personal_tax, 0) AS personal_tax,
                    COALESCE(pi.net_salary, 0) AS net_salary
             FROM users u
             LEFT JOIN contracts c ON c.id = (
                 SELECT c2.id
                 FROM contracts c2
                 WHERE c2.user_id = u.id
                 ORDER BY c2.created_at DESC, c2.id DESC
                 LIMIT 1
             )
             LEFT JOIN payroll_items pi ON pi.user_id = u.id AND pi.period_id = :period_id
             ORDER BY u.employee_code"
        );
        $stmt->execute(['period_id' => $periodId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getPayrollInputsByUserIds(array $userIds): array
    {
        if ($userIds === []) {
            return [];
        }

        $placeholders = implode(', ', array_fill(0, count($userIds), '?'));
        $stmt = $this->db->prepare(
            "SELECT u.id AS user_id, u.employee_code, c.id AS contract_id,
                    c.base_salary, c.insurance_salary, c.allowance, c.dependents_count
             FROM users u
             LEFT JOIN contracts c ON c.id = (
                 SELECT c2.id
                 FROM contracts c2
                 WHERE c2.user_id = u.id
                 ORDER BY c2.created_at DESC, c2.id DESC
                 LIMIT 1
             )
             WHERE u.id IN ({$placeholders})"
        );
        $stmt->execute($userIds);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $byUserId = [];
        foreach ($rows as $row) {
            $byUserId[(int) $row['user_id']] = $row;
        }
        return $byUserId;
    }

    public function getUsersByEmployeeCodes(array $employeeCodes): array
    {
        if ($employeeCodes === []) {
            return [];
        }

        $placeholders = implode(', ', array_fill(0, count($employeeCodes), '?'));
        $stmt = $this->db->prepare(
            "SELECT id, employee_code
             FROM users
             WHERE employee_code IN ({$placeholders})"
        );
        $stmt->execute($employeeCodes);
        $users = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $users[$row['employee_code']] = (int) $row['id'];
        }
        return $users;
    }

    public function getItemsByPeriod($periodId)
    {
        $sql = "SELECT pi.*, pp.month_year, pp.standard_days, pp.status AS period_status,
                       u.full_name, u.employee_code
                FROM payroll_items pi
                INNER JOIN payroll_periods pp ON pi.period_id = pp.id
                INNER JOIN users u ON pi.user_id = u.id
                WHERE pi.period_id = :period_id
                ORDER BY u.employee_code";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['period_id' => $periodId]);
        return $stmt->fetchAll();
    }

    // Lấy chi tiết bảng lương theo kỳ và nhân viên để trả về JSON cho React
    public function getByPeriodAndUser($periodId, $userId) {
        $sql = "SELECT pi.*, p.month_year, p.standard_days, u.full_name, u.employee_code 
                FROM payroll_items pi
                JOIN payroll_periods p ON pi.period_id = p.id
                JOIN users u ON pi.user_id = u.id
                WHERE pi.period_id = :period_id AND pi.user_id = :user_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['period_id' => $periodId, 'user_id' => $userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Lưu hoặc cập nhật kết quả tính lương real-time vào CSDL
    public function saveOrUpdate($periodId, $userId, $data) {
        $sql = "INSERT INTO payroll_items
                    (period_id, user_id, actual_days, ot_hours, gross_salary, social_insurance, tax_deduction, personal_tax, net_salary)
                VALUES
                    (:period_id, :user_id, :actual_days, :ot_hours, :gross_salary, :social_insurance, :tax_deduction, :personal_tax, :net_salary)
                ON DUPLICATE KEY UPDATE
                    actual_days = VALUES(actual_days),
                    ot_hours = VALUES(ot_hours),
                    gross_salary = VALUES(gross_salary),
                    social_insurance = VALUES(social_insurance),
                    tax_deduction = VALUES(tax_deduction),
                    personal_tax = VALUES(personal_tax),
                    net_salary = VALUES(net_salary)";

        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'period_id' => $periodId,
            'user_id' => $userId,
            'actual_days' => $data['actual_days'],
            'ot_hours' => $data['ot_hours'],
            'gross_salary' => $data['gross_salary'],
            'social_insurance' => $data['social_insurance'],
            'tax_deduction' => $data['tax_deduction'],
            'personal_tax' => $data['personal_tax'],
            'net_salary' => $data['net_salary'],
        ]);
    }

    public function getPeriodById($periodId)
    {
        $stmt = $this->db->prepare(
            "SELECT id, month_year, standard_days, status
             FROM payroll_periods
             WHERE id = :period_id
             LIMIT 1"
        );
        $stmt->execute(['period_id' => $periodId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getPeriodByIdForUpdate(int $periodId): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT id, month_year, standard_days, status
             FROM payroll_periods
             WHERE id = :period_id
             LIMIT 1
             FOR UPDATE"
        );
        $stmt->execute(['period_id' => $periodId]);
        $period = $stmt->fetch(PDO::FETCH_ASSOC);
        return $period ?: null;
    }

    public function getItemsByUserId($userId)
    {
        $sql = "SELECT pi.*, pp.month_year, pp.standard_days, pp.status AS period_status
                FROM payroll_items pi
                INNER JOIN payroll_periods pp ON pi.period_id = pp.id
                WHERE pi.user_id = :user_id
                ORDER BY pp.month_year DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['user_id' => $userId]);
        return $stmt->fetchAll();
    }

    public function getCurrentPeriod()
    {
        $stmt = $this->db->query("SELECT * FROM payroll_periods ORDER BY month_year DESC LIMIT 1");
        return $stmt->fetch();
    }
}
?>