<?php

class JobApplicationModel extends BaseModel
{
    protected $table = 'job_applications';

    private const SELECT = "SELECT a.*, b.code AS branch_code, b.name AS branch_name, b.region AS branch_region,
                                   r.full_name AS reviewer_name
                            FROM job_applications a
                            JOIN branches b ON b.id = a.branch_id
                            LEFT JOIN users r ON r.id = a.reviewed_by";

    public function create(array $d): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO job_applications
                (full_name, email, phone, date_of_birth, gender, national_id, address, branch_id, department, position,
                 education, experience_years, expected_salary, available_from, introduction, agreed_terms_at)
             VALUES
                (:full_name, :email, :phone, :date_of_birth, :gender, :national_id, :address, :branch_id, :department, :position,
                 :education, :experience_years, :expected_salary, :available_from, :introduction, NOW())"
        );
        $stmt->execute($d);
        return (int) $this->db->lastInsertId();
    }

    public function hasOpenApplication(string $email, string $nationalId): bool
    {
        $stmt = $this->db->prepare(
            "SELECT 1 FROM job_applications
             WHERE (email = :email OR national_id = :nid) AND status IN ('PENDING','APPROVED','CONTRACT_SUBMITTED') LIMIT 1"
        );
        $stmt->execute(['email' => $email, 'nid' => $nationalId]);
        return (bool) $stmt->fetch();
    }

    public function all(?string $status = null): array
    {
        $sql = self::SELECT . ($status ? ' WHERE a.status = :status' : '') . ' ORDER BY a.created_at DESC, a.id DESC';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($status ? ['status' => $status] : []);
        return $stmt->fetchAll();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare(self::SELECT . ' WHERE a.id = ?');
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function findByToken(string $token): ?array
    {
        $stmt = $this->db->prepare(self::SELECT . ' WHERE a.contract_token = ?');
        $stmt->execute([$token]);
        return $stmt->fetch() ?: null;
    }

    public function approve(int $id, int $reviewer, array $offer, string $token, string $expires, ?string $note): bool
    {
        $stmt = $this->db->prepare(
            "UPDATE job_applications
             SET status = 'APPROVED', reviewed_by = :r, reviewed_at = NOW(), review_note = :note,
                 offer_base_salary = :base, offer_allowance = :allowance, offer_start_date = :start,
                 offer_contract_type = :type, offer_probation_days = :prob,
                 contract_token = :token, token_expires_at = :exp, email_sent_at = NULL
             WHERE id = :id AND status IN ('PENDING','APPROVED')"
        );
        $stmt->execute([
            'r' => $reviewer, 'note' => $note, 'base' => $offer['base_salary'], 'allowance' => $offer['allowance'],
            'start' => $offer['start_date'], 'type' => $offer['contract_type'], 'prob' => $offer['probation_days'],
            'token' => $token, 'exp' => $expires, 'id' => $id,
        ]);
        return $stmt->rowCount() > 0;
    }

    public function reject(int $id, int $reviewer, string $note): bool
    {
        $stmt = $this->db->prepare(
            "UPDATE job_applications SET status = 'REJECTED', reviewed_by = ?, reviewed_at = NOW(), review_note = ?, contract_token = NULL
             WHERE id = ? AND status IN ('PENDING','APPROVED','CONTRACT_SUBMITTED')"
        );
        $stmt->execute([$reviewer, $note, $id]);
        return $stmt->rowCount() > 0;
    }

    public function markEmailed(int $id): void
    {
        $this->db->prepare('UPDATE job_applications SET email_sent_at = NOW() WHERE id = ?')->execute([$id]);
    }

    public function setStatus(int $id, string $status, ?int $hiredUserId = null): void
    {
        $this->db->prepare('UPDATE job_applications SET status = ?, hired_user_id = COALESCE(?, hired_user_id) WHERE id = ?')
            ->execute([$status, $hiredUserId, $id]);
    }
}
