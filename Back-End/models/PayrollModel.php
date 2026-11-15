<?php
require_once __DIR__ . '/BaseModel.php';

class PayrollModel extends BaseModel {
    protected $table = 'payroll_items';

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