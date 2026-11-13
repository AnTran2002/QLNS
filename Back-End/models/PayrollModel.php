<?php

class PayrollModel extends BaseModel
{
    protected $table = 'payroll_items';

    /**
     * Lấy tất cả payroll items của user, JOIN với payroll_periods
     */
    public function getItemsByUserId($userId)
    {
        $sql = "SELECT pi.*, pp.month_year, pp.standard_days, pp.status AS period_status
                FROM payroll_items pi
                INNER JOIN payroll_periods pp ON pi.period_id = pp.id
                WHERE pi.user_id = :user_id
                ORDER BY pp.month_year DESC";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['user_id' => $userId]);
        return $stmt->fetchAll();
    }

    /**
     * Lấy kỳ lương mới nhất
     */
    public function getCurrentPeriod()
    {
        $stmt = $this->pdo->query("SELECT * FROM payroll_periods ORDER BY month_year DESC LIMIT 1");
        return $stmt->fetch();
    }
}

