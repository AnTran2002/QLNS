<?php

require_once __DIR__ . '/../services/ContractSalaryAdjustmentPolicy.php';

class EmployeeController
{
    private const STATUSES = ['Đang làm việc', 'Thử việc', 'Nghỉ phép'];
    private const DEFAULT_PASSWORD = '123456';

    /* =====================================================================
     *  API CHO NHÂN VIÊN
     * ===================================================================== */

    /**
     * GET ?action=employee/dashboard — Dữ liệu cổng thông tin của nhân viên đang đăng nhập.
     */
    public function dashboard()
    {
        if (!require_auth('EMPLOYEE')) {
            return;
        }

        $userId = $_SESSION['user_id'];

        $userModel     = new UserModel();
        $contractModel = new ContractModel();
        $payrollModel  = new PayrollModel();

        $user = $userModel->findById($userId);
        if (!$user) {
            return json_response(404, null, 'Không tìm thấy người dùng');
        }

        $contract = $contractModel->findByUserId($userId);
        $payroll  = $payrollModel->getItemsByUserId($userId);
        $period   = $payrollModel->getCurrentPeriod();
        $team     = $userModel->findByDepartment($user['department']);

        // Tổng hợp công từ bảng lương
        $totalActualDays = 0;
        $totalOtHours    = 0;
        foreach ($payroll as $item) {
            $totalActualDays += (float) $item['actual_days'];
            $totalOtHours    += (float) $item['ot_hours'];
        }

        $workSchedule = [
            'monday'    => '08:30 - 17:30',
            'tuesday'   => '08:30 - 17:30',
            'wednesday' => '08:30 - 17:30',
            'thursday'  => '08:30 - 17:30',
            'friday'    => '08:30 - 17:30',
            'saturday'  => 'Nghỉ tuần',
            'sunday'    => 'Nghỉ tuần',
        ];

        json_response(200, [
            'user_info' => [
                'id'            => (int) $user['id'],
                'full_name'     => $user['full_name'],
                'email'         => $user['email'],
                'employee_code' => $user['employee_code'],
                'role'          => $user['role'],
                'department'    => $user['department'],
                'position'      => $user['position'],
                'status'        => $user['status'],
                'joined_at'     => $user['joined_at'],
                'avatar'        => $user['avatar'] ?? null,
            ],
            'contract' => $contract ? [
                'id'               => (int) $contract['id'],
                'base_salary'      => (float) $contract['base_salary'],
                'insurance_salary' => (float) $contract['insurance_salary'],
                'allowance'        => (float) $contract['allowance'],
                'dependents_count' => (int) $contract['dependents_count'],
                'created_at'       => $contract['created_at'],
            ] : null,
            'payroll_history' => array_map([$this, 'formatPayrollItem'], $payroll),
            'attendance_summary' => [
                'total_actual_days' => $totalActualDays,
                'total_ot_hours'    => $totalOtHours,
            ],
            'current_period' => $period ?: null,
            'work_schedule'  => $workSchedule,
            'team_members'   => array_map(fn ($m) => [
                'id'            => (int) $m['id'],
                'employee_code' => $m['employee_code'],
                'full_name'     => $m['full_name'],
                'email'         => $m['email'],
                'position'      => $m['position'],
                'status'        => $m['status'],
                'joined_at'     => $m['joined_at'],
                'avatar'        => $m['avatar'] ?? null,
            ], $team),
        ], 'Lấy dữ liệu dashboard thành công');
    }

    /**
     * GET ?action=employee/attendance&month=YYYY-MM — Chấm công theo ngày của nhân viên đang đăng nhập.
     * Không truyền month → tháng mới nhất có dữ liệu (hoặc tháng hiện tại).
     */
    public function attendance()
    {
        if (!require_auth('EMPLOYEE')) {
            return;
        }

        $userId = (int) $_SESSION['user_id'];
        $model  = new AttendanceRecordModel();

        if (!$model->tableExists()) {
            return json_response(200, [
                'available' => false,
                'month'     => date('Y-m'),
                'months'    => [],
                'records'   => [],
            ], 'Chưa có bảng chấm công theo ngày — hãy chạy migration 004_avatar_daily_attendance.sql');
        }

        $months = $model->monthsByUser($userId);
        $month  = $_GET['month'] ?? null;
        if (!is_string($month) || !preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month)) {
            $month = $months[0] ?? date('Y-m');
        }

        $records = array_map(fn ($r) => [
            'id'          => (int) $r['id'],
            'work_date'   => $r['work_date'],
            'shift'       => $r['shift'],
            'shift_start' => substr($r['shift_start'], 0, 5),
            'shift_end'   => substr($r['shift_end'], 0, 5),
            'check_in'    => $r['check_in'] !== null ? substr($r['check_in'], 0, 5) : null,
            'check_out'   => $r['check_out'] !== null ? substr($r['check_out'], 0, 5) : null,
            'status'      => $r['status'],
            'work_hours'  => (float) $r['work_hours'],
            'ot_hours'    => (float) $r['ot_hours'],
            'note'        => $r['note'],
        ], $model->findByUserAndMonth($userId, $month));

        json_response(200, [
            'available' => true,
            'month'     => $month,
            'months'    => $months,
            'records'   => $records,
        ], 'Lấy chấm công theo ngày thành công');
    }

    /* =====================================================================
     *  API CHO ADMIN — quản lý nhân viên + hợp đồng
     * ===================================================================== */

    /**
     * GET ?action=employees — Danh sách nhân viên kèm hợp đồng mới nhất.
     */
    public function index()
    {
        if (!require_method('GET') || !require_auth('ADMIN')) {
            return;
        }

        $rows = (new UserModel())->getAllWithContract();
        json_response(200, array_map([$this, 'formatEmployee'], $rows), 'Lấy danh sách nhân viên thành công');
    }

    /**
     * GET ?action=employees/show&id=1 — Chi tiết 1 nhân viên.
     */
    public function show()
    {
        if (!require_method('GET') || !require_auth('ADMIN')) {
            return;
        }

        $id = $this->idFromQuery();
        if ($id === null) {
            return json_response(400, null, 'Thiếu hoặc sai tham số id');
        }

        $row = (new UserModel())->findWithContract($id);
        if (!$row) {
            return json_response(404, null, 'Không tìm thấy nhân viên');
        }

        json_response(200, $this->formatEmployee($row), 'Lấy thông tin nhân viên thành công');
    }

    /**
     * POST ?action=employees/create — Thêm nhân viên + hợp đồng.
     * Mật khẩu mặc định: 123456 (nếu body không gửi "password").
     */
    public function store()
    {
        if (!require_method('POST') || !require_auth('ADMIN')) {
            return;
        }

        [$data, $error] = $this->validate(read_json_body());
        if ($error) {
            return json_response(422, null, $error);
        }

        $userModel = new UserModel();
        if ($userModel->existsCodeOrEmail($data['employee_code'], $data['email'])) {
            return json_response(409, null, 'Email hoặc mã nhân viên đã tồn tại');
        }

        try {
            $userModel->beginTransaction();
            $id = $userModel->create($data + [
                'password' => $data['password'] ?? self::DEFAULT_PASSWORD,
                'role'     => 'EMPLOYEE',
            ]);
            (new ContractModel())->createForUser($id, $data);
            $userModel->commit();
        } catch (Throwable $e) {
            $userModel->rollBack();
            throw $e;
        }

        json_response(201, $this->formatEmployee($userModel->findWithContract($id)), 'Đã thêm nhân viên');
    }

    /**
     * PUT ?action=employees/update&id=1 — Cập nhật hồ sơ; không thay đổi thông tin lương.
     */
    public function update()
    {
        if (!require_method('PUT', 'POST') || !require_auth('ADMIN')) {
            return;
        }

        $id = $this->idFromQuery();
        if ($id === null) {
            return json_response(400, null, 'Thiếu hoặc sai tham số id');
        }

        $userModel = new UserModel();
        if (!$userModel->findById($id)) {
            return json_response(404, null, 'Không tìm thấy nhân viên');
        }

        $input = read_json_body();
        if ($input !== null && ContractSalaryAdjustmentPolicy::containsCompensationFields($input)) {
            return json_response(422, null, 'Thông tin lương chỉ được thay đổi qua điều chỉnh lương kèm lý do');
        }

        [$data, $error] = $this->validate($input, false);
        if ($error) {
            return json_response(422, null, $error);
        }

        if ($userModel->existsCodeOrEmail($data['employee_code'], $data['email'], $id)) {
            return json_response(409, null, 'Email hoặc mã nhân viên đã tồn tại');
        }

        try {
            $userModel->beginTransaction();
            $userModel->update($id, $data);
            $userModel->commit();
        } catch (Throwable $e) {
            $userModel->rollBack();
            throw $e;
        }

        json_response(200, $this->formatEmployee($userModel->findWithContract($id)), 'Đã cập nhật nhân viên');
    }

    /**
     * DELETE ?action=employees/delete&id=1 — Xóa nhân viên (hợp đồng, bảng lương xóa theo).
     */
    public function destroy()
    {
        if (!require_method('DELETE', 'POST') || !require_auth('ADMIN')) {
            return;
        }

        $id = $this->idFromQuery();
        if ($id === null) {
            return json_response(400, null, 'Thiếu hoặc sai tham số id');
        }
        if ($id === (int) $_SESSION['user_id']) {
            return json_response(409, null, 'Không thể xóa tài khoản đang đăng nhập');
        }
        if ((new PayrollModel())->userHasPublishedPayroll($id)) {
            return json_response(409, null, 'Không thể xóa nhân viên đã có kỳ lương khóa sổ hoặc đã thanh toán');
        }

        if (!(new UserModel())->delete($id)) {
            return json_response(404, null, 'Không tìm thấy nhân viên');
        }

        json_response(200, ['id' => $id], 'Đã xóa nhân viên');
    }

    /* =====================================================================
     *  Hàm hỗ trợ
     * ===================================================================== */

    private function idFromQuery(): ?int
    {
        $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        return $id === false ? null : $id;
    }

    /**
     * Kiểm tra dữ liệu gửi lên. Trả về [dữ liệu đã chuẩn hóa, thông báo lỗi | null].
     */
    private function validate(?array $input, bool $includeContract = true): array
    {
        if ($input === null) {
            return [null, 'Dữ liệu JSON không hợp lệ'];
        }

        $text = fn ($key) => trim((string) ($input[$key] ?? ''));
        $data = [
            'employee_code' => $text('employee_code'),
            'full_name'     => $text('full_name'),
            'email'         => $text('email'),
            'department'    => $text('department'),
            'position'      => $text('position'),
            'status'        => $text('status') ?: 'Đang làm việc',
            'joined_at'     => $text('joined_at') ?: date('Y-m-d'),
        ];

        foreach (['employee_code' => 20, 'full_name' => 100, 'email' => 100, 'department' => 100, 'position' => 100] as $key => $max) {
            if ($data[$key] === '') {
                return [null, "Trường {$key} không được để trống"];
            }
            if (mb_strlen($data[$key]) > $max) {
                return [null, "Trường {$key} tối đa {$max} ký tự"];
            }
        }
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            return [null, 'Email không hợp lệ'];
        }
        if (!in_array($data['status'], self::STATUSES, true)) {
            return [null, 'Trạng thái phải là: ' . implode(', ', self::STATUSES)];
        }
        $date = DateTime::createFromFormat('Y-m-d', $data['joined_at']);
        if (!$date || $date->format('Y-m-d') !== $data['joined_at']) {
            return [null, 'joined_at phải có dạng YYYY-MM-DD'];
        }

        if ($includeContract) {
            foreach (['base_salary', 'insurance_salary', 'allowance'] as $key) {
                $value = $input[$key] ?? 0;
                if (!is_numeric($value) || (float) $value < 0 || (float) $value > 9999999999) {
                    return [null, "Trường {$key} phải là số không âm"];
                }
                $data[$key] = round((float) $value, 2);
            }
            $dependents = filter_var($input['dependents_count'] ?? 0, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => 99]]);
            if ($dependents === false) {
                return [null, 'dependents_count phải là số nguyên từ 0 đến 99'];
            }
            $data['dependents_count'] = $dependents;
        }

        if (isset($input['password']) && $input['password'] !== '') {
            if (mb_strlen((string) $input['password']) < 6) {
                return [null, 'Mật khẩu tối thiểu 6 ký tự'];
            }
            $data['password'] = (string) $input['password'];
        }

        return [$data, null];
    }

    /** Ép kiểu số để Front-End nhận number thay vì string. */
    private function formatEmployee(array $row): array
    {
        return [
            'id'               => (int) $row['id'],
            'employee_code'    => $row['employee_code'],
            'full_name'        => $row['full_name'],
            'email'            => $row['email'],
            'role'             => $row['role'],
            'department'       => $row['department'],
            'position'         => $row['position'],
            'status'           => $row['status'],
            'joined_at'        => $row['joined_at'],
            'avatar'           => $row['avatar'] ?? null,
            'contract_id'      => $row['contract_id'] !== null ? (int) $row['contract_id'] : null,
            'base_salary'      => (float) ($row['base_salary'] ?? 0),
            'insurance_salary' => (float) ($row['insurance_salary'] ?? 0),
            'allowance'        => (float) ($row['allowance'] ?? 0),
            'dependents_count' => (int) ($row['dependents_count'] ?? 0),
        ];
    }

    private function formatPayrollItem(array $item): array
    {
        return [
            'id'               => (int) $item['id'],
            'period_id'        => (int) $item['period_id'],
            'month_year'       => $item['month_year'],
            'standard_days'    => (int) $item['standard_days'],
            'period_status'    => $item['period_status'],
            'actual_days'      => (float) $item['actual_days'],
            'ot_hours'         => (float) $item['ot_hours'],
            'gross_salary'     => (float) $item['gross_salary'],
            'social_insurance' => (float) $item['social_insurance'],
            'tax_deduction'    => (float) $item['tax_deduction'],
            'personal_tax'     => (float) $item['personal_tax'],
            'net_salary'       => (float) $item['net_salary'],
        ];
    }
}
