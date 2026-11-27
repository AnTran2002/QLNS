<?php

require_once __DIR__ . '/SalaryAdjustmentSql.php';

class UserModel extends BaseModel
{
    protected $table = 'users';

    /** Các cột an toàn để trả về Front-End (không bao giờ có password). */
    private const BASE_COLUMNS = "u.id, u.employee_code, u.full_name, u.email, u.role,
        u.department, u.position, u.status,
        COALESCE(u.joined_at, DATE(u.created_at)) AS joined_at, u.created_at";

    /** Thông tin cá nhân lấy từ hợp đồng (migration 009) — chỉ trả cho chính chủ và quản trị. */
    private const PROFILE_COLUMNS = ", u.phone, u.date_of_birth, u.gender, u.national_id, u.national_id_issued_date,
        u.national_id_issued_place, u.address, u.tax_code, u.branch_id, u.tutorial_completed_at,
        (SELECT b.name FROM branches b WHERE b.id = u.branch_id) AS branch_name";

    private static ?bool $hasAvatar = null;

    /** true khi đã chạy migration 004 (cột users.avatar). */
    public function hasAvatarColumn(): bool
    {
        if (self::$hasAvatar === null) {
            $stmt = $this->db->query("SHOW COLUMNS FROM {$this->table} LIKE 'avatar'");
            self::$hasAvatar = (bool) $stmt->fetch();
        }
        return self::$hasAvatar;
    }

    /** Cột công khai + ảnh đại diện (nếu DB đã có cột). */
    private function publicColumns(): string
    {
        return self::BASE_COLUMNS . ($this->hasAvatarColumn() ? ", u.avatar" : ", NULL AS avatar");
    }

    private function privateColumns(): string
    {
        return $this->publicColumns() . self::PROFILE_COLUMNS;
    }

    /** Đánh dấu đã xem hướng dẫn sử dụng lần đầu. */
    public function completeTutorial(int $id): void
    {
        $stmt = $this->db->prepare("UPDATE {$this->table} SET tutorial_completed_at = NOW() WHERE id = :id");
        $stmt->execute(['id' => $id]);
    }

    /** Mở lại hướng dẫn (nhân viên muốn xem lại). */
    public function resetTutorial(int $id): void
    {
        $stmt = $this->db->prepare("UPDATE {$this->table} SET tutorial_completed_at = NULL WHERE id = :id");
        $stmt->execute(['id' => $id]);
    }

    public function existsNationalId(string $nationalId): bool
    {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM {$this->table} WHERE national_id = :nid");
        $stmt->execute(['nid' => $nationalId]);
        return (int) $stmt->fetchColumn() > 0;
    }

    /** Mã nhân viên kế tiếp dạng NV0xx. */
    public function nextEmployeeCode(): string
    {
        $max = (int) $this->db->query("SELECT COALESCE(MAX(CAST(SUBSTRING(employee_code, 3) AS UNSIGNED)), 0) FROM {$this->table} WHERE employee_code REGEXP '^NV[0-9]+$'")->fetchColumn();
        return 'NV' . str_pad((string) ($max + 1), 3, '0', STR_PAD_LEFT);
    }

    /** Tạo tài khoản từ hợp đồng đã duyệt — đầy đủ thông tin pháp lý. */
    public function createFromContract(array $d): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO {$this->table}
                (employee_code, full_name, email, phone, date_of_birth, gender, national_id, national_id_issued_date,
                 national_id_issued_place, address, tax_code, password, role, department, position, branch_id, status, joined_at,
                 bank_name, bank_account_name, bank_account_number, tutorial_completed_at)
             VALUES
                (:employee_code, :full_name, :email, :phone, :date_of_birth, :gender, :national_id, :national_id_issued_date,
                 :national_id_issued_place, :address, :tax_code, :password, 'EMPLOYEE', :department, :position, :branch_id, :status, :joined_at,
                 :bank_name, :bank_account_name, :bank_account_number, NULL)"
        );
        $stmt->execute([
            'employee_code' => $d['employee_code'],
            'full_name' => $d['full_name'],
            'email' => $d['email'],
            'phone' => $d['phone'],
            'date_of_birth' => $d['date_of_birth'],
            'gender' => $d['gender'],
            'national_id' => $d['national_id'],
            'national_id_issued_date' => $d['national_id_issued_date'],
            'national_id_issued_place' => $d['national_id_issued_place'],
            'address' => $d['address'],
            'tax_code' => $d['tax_code'] ?: null,
            'password' => password_hash($d['password'], PASSWORD_DEFAULT),
            'department' => $d['department'],
            'position' => $d['position'],
            'branch_id' => $d['branch_id'],
            'status' => $d['status'],
            'joined_at' => $d['joined_at'],
            'bank_name' => $d['bank_name'] ?: null,
            'bank_account_name' => $d['bank_account_name'] ?: null,
            'bank_account_number' => $d['bank_account_number'] ?: null,
        ]);
        return (int) $this->db->lastInsertId();
    }

    /** Cập nhật ảnh đại diện (data URL) hoặc xoá (null). */
    public function updateAvatar(int $id, ?string $avatar): void
    {
        $stmt = $this->db->prepare("UPDATE {$this->table} SET avatar = :avatar WHERE id = :id");
        $stmt->execute(['id' => $id, 'avatar' => $avatar]);
    }

    /**
     * Tìm user theo email hoặc mã nhân viên (employee_code) — dùng khi đăng nhập (có password).
     */
    public function findByCodeOrEmail($identifier)
    {
        $stmt = $this->db->prepare("SELECT * FROM {$this->table} WHERE employee_code = :code OR email = :email LIMIT 1");
        $stmt->execute(['code' => $identifier, 'email' => $identifier]);
        return $stmt->fetch();
    }

    /**
     * Tìm user theo email
     */
    public function findByEmail($email)
    {
        $stmt = $this->db->prepare("SELECT * FROM {$this->table} WHERE email = :email LIMIT 1");
        $stmt->execute(['email' => $email]);
        return $stmt->fetch();
    }

    /**
     * Tìm user theo ID (không có password)
     */
    public function findById($id)
    {
        $stmt = $this->db->prepare("SELECT " . $this->privateColumns() . " FROM {$this->table} u WHERE u.id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    /**
     * Lấy tất cả users (cho admin)
     */
    public function getAll()
    {
        $stmt = $this->db->query("SELECT " . $this->publicColumns() . " FROM {$this->table} u ORDER BY u.id ASC");
        return $stmt->fetchAll();
    }

    /**
     * Danh sách nhân viên kèm hợp đồng mới nhất (mỗi người 1 dòng).
     */
    public function getAllWithContract()
    {
        $sql = "SELECT " . $this->privateColumns() . ",
                       c.id AS contract_id, c.contract_number, c.contract_type, c.start_date, c.end_date, " . SalaryAdjustmentSql::selectedFields() . "
                FROM {$this->table} u
                LEFT JOIN contracts c ON c.id = (
                    SELECT c2.id FROM contracts c2
                    WHERE c2.user_id = u.id
                    ORDER BY c2.created_at DESC, c2.id DESC
                    LIMIT 1
                )
                " . SalaryAdjustmentSql::effectiveJoin() . "
                ORDER BY u.id ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['effective_month' => date('Y-m')]);
        return $stmt->fetchAll();
    }

    /**
     * Một nhân viên kèm hợp đồng mới nhất.
     */
    public function findWithContract($id)
    {
        $sql = "SELECT " . $this->privateColumns() . ",
                       c.id AS contract_id, c.contract_number, c.contract_type, c.start_date, c.end_date, " . SalaryAdjustmentSql::selectedFields() . "
                FROM {$this->table} u
                LEFT JOIN contracts c ON c.id = (
                    SELECT c2.id FROM contracts c2
                    WHERE c2.user_id = u.id
                    ORDER BY c2.created_at DESC, c2.id DESC
                    LIMIT 1
                )
                " . SalaryAdjustmentSql::effectiveJoin() . "
                WHERE u.id = :id
                LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $id, 'effective_month' => date('Y-m')]);
        return $stmt->fetch();
    }

    /**
     * Đồng nghiệp cùng phòng ban.
     */
    public function findByDepartment(string $department)
    {
        $stmt = $this->db->prepare("SELECT " . $this->publicColumns() . " FROM {$this->table} u WHERE u.department = :department ORDER BY u.id ASC");
        $stmt->execute(['department' => $department]);
        return $stmt->fetchAll();
    }

    /**
     * Kiểm tra trùng mã nhân viên / email (bỏ qua chính bản ghi $exceptId khi cập nhật).
     */
    public function existsCodeOrEmail(string $code, string $email, ?int $exceptId = null): bool
    {
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) FROM {$this->table}
             WHERE (employee_code = :code OR email = :email) AND id <> :except_id"
        );
        $stmt->execute(['code' => $code, 'email' => $email, 'except_id' => $exceptId ?? 0]);
        return (int) $stmt->fetchColumn() > 0;
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO {$this->table}
                (employee_code, full_name, email, password, role, department, position, status, joined_at)
             VALUES
                (:employee_code, :full_name, :email, :password, :role, :department, :position, :status, :joined_at)"
        );
        $stmt->execute([
            'employee_code' => $data['employee_code'],
            'full_name'     => $data['full_name'],
            'email'         => $data['email'],
            'password'      => password_hash($data['password'], PASSWORD_DEFAULT),
            'role'          => $data['role'],
            'department'    => $data['department'],
            'position'      => $data['position'],
            'status'        => $data['status'],
            'joined_at'     => $data['joined_at'],
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): void
    {
        $stmt = $this->db->prepare(
            "UPDATE {$this->table}
             SET employee_code = :employee_code, full_name = :full_name, email = :email,
                 department = :department, position = :position, status = :status, joined_at = :joined_at
             WHERE id = :id"
        );
        $stmt->execute([
            'id'            => $id,
            'employee_code' => $data['employee_code'],
            'full_name'     => $data['full_name'],
            'email'         => $data['email'],
            'department'    => $data['department'],
            'position'      => $data['position'],
            'status'        => $data['status'],
            'joined_at'     => $data['joined_at'],
        ]);
    }

    public function delete(int $id): bool
    {
        // contracts và payroll_items có ON DELETE CASCADE nên tự xóa theo.
        $stmt = $this->db->prepare("DELETE FROM {$this->table} WHERE id = :id");
        $stmt->execute(['id' => $id]);
        return $stmt->rowCount() > 0;
    }
}
