<?php

require_once __DIR__ . '/../services/PayrollEngine.php';
require_once __DIR__ . '/../services/AttendanceService.php';
require_once __DIR__ . '/../services/PayrollRunService.php';
require_once __DIR__ . '/../services/PayrollPeriodService.php';
require_once __DIR__ . '/../services/XlsxExportWriter.php';
require_once __DIR__ . '/../services/PayslipRenderer.php';
require_once __DIR__ . '/../services/PayrollPeriodPolicy.php';

class PayrollController
{
    public function periods()
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        if (!in_array($method, ['GET', 'POST'], true)) {
            header('Allow: GET, POST');
            return json_response(405, null, 'Phương thức không được hỗ trợ');
        }
        if (!require_auth('ADMIN')) {
            return;
        }

        if ($method === 'POST') {
            return $this->createPeriod();
        }

        $rows = (new PayrollModel())->getAllPeriods();
        foreach ($rows as &$row) {
            $row['id'] = (int) $row['id'];
            $row['standard_days'] = (int) $row['standard_days'];
            $row['items_count'] = (int) $row['items_count'];
            $row['total_gross'] = (float) $row['total_gross'];
            $row['total_net'] = (float) $row['total_net'];
        }
        unset($row);

        json_response(200, $rows, 'Lấy danh sách kỳ lương thành công');
    }

    /**
     * Ngày công & OT của kỳ — CHỈ ĐỌC. Kỳ DRAFT được đồng bộ tự động từ chấm công theo ngày
     * mỗi lần xem; kỳ đã khoá giữ nguyên số liệu đã chốt.
     */
    public function attendance()
    {
        if (!require_method('GET') || !require_auth('ADMIN')) {
            return;
        }

        $periodId = filter_var($_GET['period_id'] ?? null, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1],
        ]);
        if ($periodId === false) {
            return json_response(400, null, 'Thiếu hoặc sai tham số period_id');
        }

        $model = new PayrollModel();
        $period = $model->getPeriodById($periodId);
        if (!$period) {
            return json_response(404, null, 'Không tìm thấy kỳ lương');
        }

        $service = new AttendanceService($model);
        $missingContracts = [];
        if ($period['status'] === 'DRAFT') {
            try {
                $sync = $service->sync($periodId);
                $period = $sync['period'];
                $missingContracts = $sync['missing_contracts'];
            } catch (AttendanceException $e) {
                return json_response($e->statusCode, $e->details ?: null, $e->getMessage());
            }
        }

        json_response(200, [
            'period' => $period,
            'auto' => true,
            'synced_until' => $service->lastRecordedDate($period['month_year']),
            'missing_contracts' => $missingContracts,
            'items' => array_map([$this, 'formatAttendanceRow'], $service->rows($period)),
        ], 'Lấy dữ liệu ngày công và OT thành công');
    }

    public function items()
    {
        if (!require_method('GET') || !require_auth('ADMIN')) {
            return;
        }

        $periodId = filter_var($_GET['period_id'] ?? null, FILTER_VALIDATE_INT);
        if ($periodId === false || $periodId < 1) {
            json_response(400, null, 'Thiếu hoặc sai tham số period_id');
            return;
        }

        $model = new PayrollModel();
        $period = $model->getPeriodById($periodId);
        if (!$period) {
            json_response(404, null, 'Không tìm thấy kỳ lương');
            return;
        }
        if ($period['status'] === 'DRAFT') {
            try {
                (new AttendanceService($model))->sync($periodId);
            } catch (AttendanceException $e) {
                return json_response($e->statusCode, $e->details ?: null, $e->getMessage());
            }
        }

        $rows = $model->getItemsByPeriod($periodId);
        foreach ($rows as &$row) {
            foreach ([
                'id', 'period_id', 'user_id', 'standard_days',
            ] as $field) {
                if (isset($row[$field])) {
                    $row[$field] = (int) $row[$field];
                }
            }
            foreach ([
                'actual_days', 'ot_hours', 'gross_salary', 'social_insurance',
                'tax_deduction', 'personal_tax', 'net_salary',
            ] as $field) {
                if (isset($row[$field])) {
                    $row[$field] = (float) $row[$field];
                }
            }
        }
        unset($row);

        json_response(200, $rows, 'Lấy danh sách lương theo kỳ thành công');
    }

    public function run()
    {
        if (!require_method('POST') || !require_auth('ADMIN')) {
            return;
        }

        $input = read_json_body();
        if ($input === null) {
            return json_response(400, null, 'Dữ liệu JSON không hợp lệ');
        }

        $periodId = filter_var($input['period_id'] ?? null, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1],
        ]);
        if ($periodId === false) {
            return json_response(400, null, 'period_id phải là số nguyên dương');
        }

        try {
            (new AttendanceService())->sync($periodId);
            $result = (new PayrollRunService())->run($periodId);
            $result['items'] = array_map([$this, 'formatPayrollItem'], $result['items']);
            json_response(200, $result, 'Đã chạy và lưu bảng lương cho toàn kỳ');
        } catch (AttendanceException $e) {
            json_response($e->statusCode, $e->details ?: null, $e->getMessage());
        } catch (PayrollRunException $e) {
            json_response($e->statusCode, $e->details ?: null, $e->getMessage());
        } catch (PDOException $e) {
            error_log($e->getMessage());
            json_response(500, null, 'Không thể chạy bảng lương do lỗi cơ sở dữ liệu');
        }
    }

    public function lockPeriod()
    {
        if (!require_method('POST') || !require_auth('ADMIN')) {
            return;
        }

        $input = read_json_body();
        if ($input === null) {
            return json_response(400, null, 'Dữ liệu JSON không hợp lệ');
        }
        $periodId = filter_var($input['period_id'] ?? null, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1],
        ]);
        if ($periodId === false) {
            return json_response(400, null, 'period_id phải là số nguyên dương');
        }

        try {
            $period = (new PayrollModel())->getPeriodById($periodId);
            if ($period && $period['status'] === 'DRAFT') {
                (new AttendanceService())->sync($periodId);
            }
            $result = (new PayrollPeriodService())->lock($periodId);
            $result['items'] = array_map([$this, 'formatPayrollItem'], $result['items']);
            json_response(200, $result, 'Đã khóa sổ kỳ lương');
        } catch (AttendanceException $e) {
            json_response($e->statusCode, $e->details ?: null, $e->getMessage());
        } catch (PayrollPeriodException $e) {
            json_response($e->statusCode, $e->details ?: null, $e->getMessage());
        } catch (PDOException $e) {
            error_log($e->getMessage());
            json_response(500, null, 'Không thể khóa kỳ lương do lỗi cơ sở dữ liệu');
        }
    }

    public function saveBankAccount()
    {
        if (!require_method('POST', 'PUT') || !require_auth('ADMIN')) {
            return;
        }

        $input = read_json_body();
        if ($input === null) {
            return json_response(400, null, 'Dữ liệu JSON không hợp lệ');
        }
        $userId = filter_var($input['user_id'] ?? null, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1],
        ]);
        if ($userId === false) {
            return json_response(400, null, 'user_id phải là số nguyên dương');
        }

        foreach (['bank_name', 'bank_account_name', 'bank_account_number'] as $field) {
            if (!isset($input[$field]) || !is_string($input[$field])) {
                return json_response(422, null, "{$field} phải là chuỗi hợp lệ");
            }
        }
        $bankName = trim($input['bank_name']);
        $accountName = trim($input['bank_account_name']);
        $accountNumber = trim($input['bank_account_number']);
        if ($bankName === '' || mb_strlen($bankName, 'UTF-8') > 100) {
            return json_response(422, null, 'bank_name không được để trống và tối đa 100 ký tự');
        }
        if ($accountName === '' || mb_strlen($accountName, 'UTF-8') > 100) {
            return json_response(422, null, 'bank_account_name không được để trống và tối đa 100 ký tự');
        }
        if (preg_match('/^\d{5,34}$/', $accountNumber) !== 1) {
            return json_response(422, null, 'bank_account_number phải gồm từ 5 đến 34 chữ số');
        }

        $model = new PayrollModel();
        if (!$model->getBankAccount($userId)) {
            return json_response(404, null, 'Không tìm thấy nhân viên');
        }
        $model->updateBankAccount($userId, [
            'bank_name' => $bankName,
            'bank_account_name' => $accountName,
            'bank_account_number' => $accountNumber,
        ]);
        json_response(200, $model->getBankAccount($userId), 'Đã cập nhật tài khoản nhận lương');
    }

    public function exportBankTransfers()
    {
        if (!require_method('GET') || !require_auth('ADMIN')) {
            return;
        }

        $periodId = filter_var($_GET['period_id'] ?? null, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1],
        ]);
        if ($periodId === false) {
            return json_response(400, null, 'Thiếu hoặc sai tham số period_id');
        }

        $model = new PayrollModel();
        $period = $model->getPeriodById($periodId);
        if (!$period) {
            return json_response(404, null, 'Không tìm thấy kỳ lương');
        }
        if ($period['status'] !== 'LOCKED') {
            return json_response(409, null, 'Chỉ xuất chuyển khoản cho kỳ đang ở trạng thái LOCKED');
        }
        if (preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $period['month_year']) !== 1) {
            return json_response(422, null, 'Kỳ lương có định dạng tháng không hợp lệ');
        }

        $rows = $model->getBankTransferRows($periodId);
        if ($rows === []) {
            return json_response(422, null, 'Kỳ lương chưa có dữ liệu chuyển khoản');
        }

        $missingAccounts = [];
        $exportRows = [];
        foreach ($rows as $row) {
            if (trim((string) $row['bank_name']) === ''
                || trim((string) $row['bank_account_name']) === ''
                || preg_match('/^\d{5,34}$/', (string) $row['bank_account_number']) !== 1
            ) {
                $missingAccounts[] = $row['employee_code'];
                continue;
            }
            if (!is_numeric($row['net_salary']) || !is_finite((float) $row['net_salary']) || (float) $row['net_salary'] < 0) {
                return json_response(422, [
                    'employee_code' => $row['employee_code'],
                ], 'Số tiền chuyển khoản không hợp lệ');
            }

            $exportRows[] = [
                $row['employee_code'],
                $row['full_name'],
                $row['bank_name'],
                $row['bank_account_name'],
                $row['bank_account_number'],
                (float) $row['net_salary'],
                'Luong ' . $period['month_year'] . ' ' . $row['employee_code'],
            ];
        }
        if ($missingAccounts !== []) {
            return json_response(422, [
                'employee_codes' => $missingAccounts,
            ], 'Cần cập nhật tài khoản ngân hàng cho tất cả nhân viên trước khi xuất file');
        }

        $path = tempnam(sys_get_temp_dir(), 'qlns-bank-');
        if ($path === false) {
            return json_response(500, null, 'Không thể tạo file chuyển khoản');
        }

        try {
            (new XlsxExportWriter())->write($path, [
                'Mã nhân viên',
                'Họ và tên',
                'Ngân hàng',
                'Tên chủ tài khoản',
                'Số tài khoản',
                'Số tiền (VND)',
                'Nội dung chuyển khoản',
            ], $exportRows);

            $filename = 'bank-transfer-' . $period['month_year'] . '.xlsx';
            header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            header('Content-Length: ' . filesize($path));
            header('Cache-Control: no-store, private');
            readfile($path);
        } catch (RuntimeException $e) {
            error_log($e->getMessage());
            if (!headers_sent()) {
                json_response(500, null, 'Không thể tạo file chuyển khoản Excel');
            }
        } finally {
            if (is_file($path)) {
                unlink($path);
            }
        }
    }

    public function payslip()
    {
        if (!require_method('GET') || !require_auth('EMPLOYEE')) {
            return;
        }

        $payslip = $this->publishedPayslipForCurrentEmployee();
        if ($payslip === null) {
            return;
        }
        foreach ([
            'id', 'period_id', 'user_id', 'standard_days',
        ] as $field) {
            if (isset($payslip[$field])) {
                $payslip[$field] = (int) $payslip[$field];
            }
        }
        foreach ([
            'actual_days', 'ot_hours', 'gross_salary', 'social_insurance',
            'tax_deduction', 'personal_tax', 'net_salary',
        ] as $field) {
            if (isset($payslip[$field])) {
                $payslip[$field] = (float) $payslip[$field];
            }
        }
        header('Cache-Control: no-store, private');
        json_response(200, $payslip, 'Lấy phiếu lương thành công');
    }

    public function downloadPayslip()
    {
        if (!require_method('GET') || !require_auth('EMPLOYEE')) {
            return;
        }

        $payslip = $this->publishedPayslipForCurrentEmployee();
        if ($payslip === null) {
            return;
        }

        $employeeCode = preg_replace('/[^A-Za-z0-9_-]/', '', $payslip['employee_code']);
        $filename = 'payslip-' . $employeeCode . '-' . $payslip['month_year'] . '.html';
        header('Content-Type: text/html; charset=UTF-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: no-store, private');
        echo (new PayslipRenderer())->render($payslip);
    }

    /**
     * Tạo kỳ lương: không cho tạo tháng đã qua (PayrollPeriodPolicy).
     * Công chuẩn tự tính = số ngày T2–T6 của tháng; client không gửi/sửa được.
     */
    private function createPeriod()
    {
        $input = read_json_body();
        if ($input === null) {
            return json_response(400, null, 'Dữ liệu JSON không hợp lệ');
        }

        $monthYear = trim((string) ($input['month_year'] ?? ''));
        $monthError = PayrollPeriodPolicy::validateCreationMonth($monthYear);
        if ($monthError !== null) {
            return json_response(422, null, $monthError);
        }

        $standardDays = AttendanceService::weekdaysInMonth($monthYear);

        try {
            $model = new PayrollModel();
            $periodId = $model->createPeriod($monthYear, $standardDays);
            json_response(201, $model->getPeriodById($periodId), 'Đã tạo kỳ lương mới');
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                return json_response(409, null, 'Kỳ lương tháng này đã tồn tại');
            }
            throw $e;
        }
    }

    private function formatAttendanceRow(array $row): array
    {
        foreach (['user_id', 'payroll_item_id', 'dependents_count'] as $field) {
            if (isset($row[$field])) {
                $row[$field] = (int) $row[$field];
            }
        }
        foreach ([
            'base_salary', 'insurance_salary', 'allowance', 'actual_days', 'ot_hours',
            'gross_salary', 'social_insurance', 'tax_deduction', 'personal_tax', 'net_salary',
        ] as $field) {
            $row[$field] = $row[$field] === null ? null : (float) $row[$field];
        }
        return $row;
    }

    private function formatPayrollItem(array $item): array
    {
        foreach (['id', 'period_id', 'user_id', 'standard_days'] as $field) {
            if (isset($item[$field])) {
                $item[$field] = (int) $item[$field];
            }
        }
        foreach ([
            'actual_days', 'ot_hours', 'gross_salary', 'social_insurance',
            'tax_deduction', 'personal_tax', 'net_salary',
        ] as $field) {
            if (isset($item[$field])) {
                $item[$field] = (float) $item[$field];
            }
        }
        return $item;
    }

    private function publishedPayslipForCurrentEmployee(): ?array
    {
        $periodId = filter_var($_GET['period_id'] ?? null, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1],
        ]);
        if ($periodId === false) {
            json_response(400, null, 'Thiếu hoặc sai tham số period_id');
            return null;
        }

        $payslip = (new PayrollModel())->getPublishedPayslip($periodId, (int) $_SESSION['user_id']);
        if (!$payslip) {
            json_response(404, null, 'Không tìm thấy phiếu lương đã phát hành');
            return null;
        }
        return $payslip;
    }
}
