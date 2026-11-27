<?php

require_once __DIR__ . '/SalaryAdjustmentSql.php';

class ContractModel extends BaseModel
{
    protected $table = 'contracts';

    /**
     * Lấy hợp đồng theo user ID
     */
    public function findByUserId($userId)
    {
        $sql = "SELECT c.id, c.user_id, " . SalaryAdjustmentSql::selectedFields() . ", c.contract_number, c.contract_type, c.start_date, c.end_date, c.probation_days, c.probation_salary_rate, c.job_title, c.branch_id, c.working_hours_per_day, c.working_days_per_week, c.annual_leave_days, c.payment_method, c.pay_day, c.commitments, c.signed_date, c.document_id, c.created_at
                FROM {$this->table} c
                " . SalaryAdjustmentSql::effectiveJoin() . "
                WHERE c.user_id = :user_id
                ORDER BY c.created_at DESC, c.id DESC
                LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['user_id' => $userId, 'effective_month' => date('Y-m')]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Lấy danh sách toàn bộ hợp đồng kèm thông tin nhân sự (cho UC-01)
     */
    public function getAllWithUser(): array
    {
        $sql = "SELECT c.id, c.user_id, " . SalaryAdjustmentSql::selectedFields() . ", c.contract_number, c.contract_type, c.start_date, c.end_date, c.probation_days, c.probation_salary_rate, c.job_title, c.branch_id, c.working_hours_per_day, c.working_days_per_week, c.annual_leave_days, c.payment_method, c.pay_day, c.commitments, c.signed_date, c.document_id, c.created_at,
                       u.employee_code, u.full_name, u.email, u.department, u.position, u.status, u.role
                FROM {$this->table} c
                " . SalaryAdjustmentSql::effectiveJoin() . "
                JOIN users u ON c.user_id = u.id
                ORDER BY c.id ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['effective_month' => date('Y-m')]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Lấy chi tiết thông tin hợp đồng theo ID hợp đồng hoặc User ID (cho UC-01)
     */
    public function findByIdWithUser(int $id): ?array
    {
        // Tìm theo contract ID trước
        $stmt = $this->db->prepare(
            "SELECT c.id, c.user_id, " . SalaryAdjustmentSql::selectedFields() . ", c.contract_number, c.contract_type, c.start_date, c.end_date, c.probation_days, c.probation_salary_rate, c.job_title, c.branch_id, c.working_hours_per_day, c.working_days_per_week, c.annual_leave_days, c.payment_method, c.pay_day, c.commitments, c.signed_date, c.document_id, c.created_at,
                    u.employee_code, u.full_name, u.email, u.department, u.position, u.status, u.role
             FROM {$this->table} c
             " . SalaryAdjustmentSql::effectiveJoin() . "
             JOIN users u ON c.user_id = u.id
             WHERE c.id = :id
             LIMIT 1"
        );
        $stmt->execute(['id' => $id, 'effective_month' => date('Y-m')]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return $row;
        }

        // Dự phòng tìm theo user_id nếu không tìm thấy contract id
        $stmt = $this->db->prepare(
            "SELECT c.id, c.user_id, " . SalaryAdjustmentSql::selectedFields() . ", c.contract_number, c.contract_type, c.start_date, c.end_date, c.probation_days, c.probation_salary_rate, c.job_title, c.branch_id, c.working_hours_per_day, c.working_days_per_week, c.annual_leave_days, c.payment_method, c.pay_day, c.commitments, c.signed_date, c.document_id, c.created_at,
                    u.employee_code, u.full_name, u.email, u.department, u.position, u.status, u.role
             FROM {$this->table} c
             " . SalaryAdjustmentSql::effectiveJoin() . "
             JOIN users u ON c.user_id = u.id
             WHERE c.user_id = :user_id
             ORDER BY c.created_at DESC, c.id DESC
             LIMIT 1"
        );
        $stmt->execute(['user_id' => $id, 'effective_month' => date('Y-m')]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Lưu thông số hợp đồng ban đầu khi tạo nhân viên.
     */
    /** Kiểm tra trùng số hợp đồng. */
    public function existsContractNumber(string $number): bool
    {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM {$this->table} WHERE contract_number = :n");
        $stmt->execute(['n' => $number]);
        return (int) $stmt->fetchColumn() > 0;
    }

    /** Lưu hợp đồng đọc được từ file đã duyệt (đủ điều khoản Điều 21 BLLĐ 2019). */
    public function createFromDocument(int $userId, array $d, int $documentId): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO {$this->table}
                (user_id, contract_number, contract_type, start_date, end_date, probation_days, probation_salary_rate,
                 job_title, branch_id, working_hours_per_day, working_days_per_week, annual_leave_days,
                 base_salary, insurance_salary, dependents_count, allowance, payment_method, pay_day, commitments,
                 signed_date, document_id)
             VALUES
                (:user_id, :contract_number, :contract_type, :start_date, :end_date, :probation_days, :probation_salary_rate,
                 :job_title, :branch_id, :working_hours_per_day, :working_days_per_week, :annual_leave_days,
                 :base_salary, :insurance_salary, :dependents_count, :allowance, :payment_method, :pay_day, :commitments,
                 :signed_date, :document_id)"
        );
        $stmt->execute([
            'user_id' => $userId,
            'contract_number' => $d['contract_number'],
            'contract_type' => $d['contract_type'],
            'start_date' => $d['start_date'],
            'end_date' => $d['end_date'],
            'probation_days' => $d['probation_days'],
            'probation_salary_rate' => $d['probation_salary_rate'],
            'job_title' => $d['position'],
            'branch_id' => $d['branch_id'],
            'working_hours_per_day' => $d['working_hours_per_day'],
            'working_days_per_week' => $d['working_days_per_week'],
            'annual_leave_days' => $d['annual_leave_days'],
            'base_salary' => $d['base_salary'],
            'insurance_salary' => $d['insurance_salary'],
            'dependents_count' => $d['dependents_count'],
            'allowance' => $d['allowance'],
            'payment_method' => $d['payment_method'],
            'pay_day' => $d['pay_day'],
            'commitments' => $d['commitments'],
            'signed_date' => $d['signed_date'],
            'document_id' => $documentId,
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function createForUser(int $userId, array $data): void
    {
        $stmt = $this->db->prepare(
            "INSERT INTO {$this->table} (user_id, base_salary, insurance_salary, allowance, dependents_count)
             VALUES (:user_id, :base_salary, :insurance_salary, :allowance, :dependents_count)"
        );
        $stmt->execute([
            'user_id'          => $userId,
            'base_salary'      => $data['base_salary'],
            'insurance_salary' => $data['insurance_salary'],
            'allowance'        => $data['allowance'],
            'dependents_count' => $data['dependents_count'],
        ]);
    }
}
