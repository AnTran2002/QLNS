<?php

class ContractDocumentModel extends BaseModel
{
    protected $table = 'contract_documents';

    private const SELECT = "SELECT d.*, a.full_name AS applicant_name, a.email AS applicant_email,
                                   up.full_name AS uploader_name, rv.full_name AS reviewer_name,
                                   u.employee_code AS hired_employee_code
                            FROM contract_documents d
                            LEFT JOIN job_applications a ON a.id = d.application_id
                            LEFT JOIN users up ON up.id = d.uploaded_by
                            LEFT JOIN users rv ON rv.id = d.reviewed_by
                            LEFT JOIN users u ON u.id = d.user_id";

    public function create(array $d): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO contract_documents
                (application_id, contract_number, source, original_filename, stored_path, file_hash,
                 scan_filename, scan_path, extracted_data, validation, uploaded_by)
             VALUES (:application_id, :contract_number, :source, :original_filename, :stored_path, :file_hash,
                 :scan_filename, :scan_path, :extracted_data, :validation, :uploaded_by)"
        );
        $stmt->execute($d);
        return (int) $this->db->lastInsertId();
    }

    public function all(?string $status = null): array
    {
        $sql = self::SELECT . ($status ? ' WHERE d.status = :status' : '') . ' ORDER BY d.created_at DESC, d.id DESC';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($status ? ['status' => $status] : []);
        return $stmt->fetchAll();
    }

    public function find(int $id, bool $forUpdate = false): ?array
    {
        $stmt = $this->db->prepare(self::SELECT . ' WHERE d.id = ?' . ($forUpdate ? ' FOR UPDATE' : ''));
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function findActiveByHash(string $hash): ?array
    {
        $stmt = $this->db->prepare("SELECT id FROM contract_documents WHERE file_hash = ? AND status <> 'REJECTED' LIMIT 1");
        $stmt->execute([$hash]);
        return $stmt->fetch() ?: null;
    }

    public function pendingForApplication(int $applicationId): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM contract_documents WHERE application_id = ? AND status = 'PENDING_REVIEW' ORDER BY id DESC LIMIT 1");
        $stmt->execute([$applicationId]);
        return $stmt->fetch() ?: null;
    }

    public function attachScan(int $id, string $filename, string $path): void
    {
        $this->db->prepare('UPDATE contract_documents SET scan_filename = ?, scan_path = ? WHERE id = ?')->execute([$filename, $path, $id]);
    }

    public function updateValidation(int $id, string $json): void
    {
        $this->db->prepare('UPDATE contract_documents SET validation = ? WHERE id = ?')->execute([$json, $id]);
    }

    public function review(int $id, string $status, int $reviewer, ?string $note, ?int $userId = null): void
    {
        $this->db->prepare(
            "UPDATE contract_documents SET status = ?, reviewed_by = ?, reviewed_at = NOW(), review_note = ?, user_id = COALESCE(?, user_id)
             WHERE id = ?"
        )->execute([$status, $reviewer, $note, $userId, $id]);
    }
}
