<?php

require_once __DIR__ . '/../services/PayrollEngine.php';
require_once __DIR__ . '/../services/AttendanceService.php';
require_once __DIR__ . '/../services/XlsxAttendanceReader.php';
require_once __DIR__ . '/../services/PayrollRunService.php';
require_once __DIR__ . '/../services/PayrollPeriodService.php';
require_once __DIR__ . '/../services/XlsxExportWriter.php';
require_once __DIR__ . '/../services/PayslipRenderer.php';
require_once __DIR__ . '/../services/PayrollPeriodPolicy.php';
require_once __DIR__ . '/../models/AttendanceRecordModel.php';
require_once __DIR__ . '/../services/PayrollChangePolicy.php';

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

    public function attendance()
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        if (!in_array($method, ['GET', 'POST', 'PUT'], true)) {
            header('Allow: GET, POST, PUT');
            return json_response(405, null, 'Phương thức không được hỗ trợ');
        }
        if (!require_auth('ADMIN')) {
            return;
        }

        if ($method !== 'GET') {
            return $this->saveAttendance();
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

        if ($period['status'] === 'DRAFT') {
            $attendanceModel = new AttendanceRecordModel();
            if (!$attendanceModel->tableExists()) {
                return json_response(409, null, 'Chưa có bảng chấm công theo ngày — hãy chạy migration 004_avatar_daily_attendance.sql');
            }
            $workedDaysByUser = $attendanceModel->workedDaysByUserForMonth($period['month_year']);
            $items = $model->getAttendanceRows($periodId);
            foreach ($items as &$item) {
                $item['actual_days'] = $workedDaysByUser[(int) $item['user_id']] ?? 0;
            }
            unset($item);
        } else {
            $items = $model->getAttendanceRows($periodId);
        }

        json_response(200, [
            'period' => $period,
            'items' => array_map([$this, 'formatAttendanceRow'], $items),
        ], 'Lấy dữ liệu ngày công và OT thành công');
    }

    public function changes()
    {
        if (!require_method('GET') || !require_auth('ADMIN')) {
            return;
        }

        $periodId = filter_var($_GET['period_id'] ?? null, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1],
        ]);
        $userId = filter_var($_GET['user_id'] ?? null, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1],
        ]);
        if ($periodId === false || $userId === false) {
            return json_response(400, null, 'period_id và user_id phải là số nguyên dương');
        }

        $history = (new PayrollModel())->getPayrollChangeHistory((int) $periodId, (int) $userId);
        foreach ($history as &$entry) {
            foreach ([
                'id', 'period_id', 'user_id',
            ] as $field) {
                $entry[$field] = (int) $entry[$field];
            }
            foreach ([
                'previous_actual_days', 'actual_days', 'previous_ot_hours', 'ot_hours',
                'previous_gross_salary', 'gross_salary', 'previous_social_insurance', 'social_insurance',
                'previous_tax_deduction', 'tax_deduction', 'previous_personal_tax', 'personal_tax',
                'previous_net_salary', 'net_salary',
            ] as $field) {
                $entry[$field] = $entry[$field] === null ? null : (float) $entry[$field];
            }
            if (isset($entry['changed_by'])) {
                $entry['changed_by'] = (int) $entry['changed_by'];
            }
        }
        unset($entry);

        json_response(200, $history, 'Lấy lịch sử thay đổi lương thành công');
    }

    public function importAttendance()
    {
        if (!require_method('POST') || !require_auth('ADMIN')) {
            return;
        }

        $periodId = filter_var($_POST['period_id'] ?? null, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1],
        ]);
        if ($periodId === false) {
            return json_response(400, null, 'Thiếu hoặc sai tham số period_id');
        }

        if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
            return json_response(422, null, 'Thiếu file Excel trong trường multipart "file"');
        }

        $file = $_FILES['file'];
        $uploadError = $file['error'] ?? UPLOAD_ERR_NO_FILE;
        if ($uploadError !== UPLOAD_ERR_OK) {
            $status = in_array($uploadError, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) ? 413 : 422;
            return json_response($status, null, 'Upload file Excel không thành công');
        }
        if (!isset($file['tmp_name'], $file['name'], $file['size'])
            || !is_string($file['tmp_name'])
            || !is_string($file['name'])
            || (int) $file['size'] < 4
            || (int) $file['size'] > 10485760
            || strtolower(pathinfo($file['name'], PATHINFO_EXTENSION)) !== 'xlsx'
            || !is_uploaded_file($file['tmp_name'])
        ) {
            return json_response(422, null, 'File phải là .xlsx hợp lệ và không vượt quá 10 MB');
        }
        if (file_get_contents($file['tmp_name'], false, null, 0, 4) !== "PK\x03\x04") {
            return json_response(422, null, 'Nội dung file không phải Excel .xlsx hợp lệ');
        }

        try {
            $records = (new XlsxAttendanceReader())->read($file['tmp_name']);
        } catch (UnexpectedValueException $e) {
            return json_response(422, null, $e->getMessage());
        } catch (RuntimeException $e) {
            error_log($e->getMessage());
            return json_response(500, null, 'Không thể xử lý tệp Excel lúc này. Vui lòng thử lại sau.');
        }

        $employeeCodes = [];
        $rowNumbersByCode = [];
        $inputErrors = [];
        foreach ($records as $record) {
            $code = trim($record['employee_code']);
            $normalizedCode = strtoupper($code);
            if ($code === '') {
                $inputErrors[] = [
                    'row_number' => $record['row_number'],
                    'message' => 'Thiếu mã nhân viên',
                ];
                continue;
            }
            if (isset($rowNumbersByCode[$normalizedCode])) {
                $inputErrors[] = [
                    'row_number' => $record['row_number'],
                    'message' => 'Mã nhân viên bị lặp trong file',
                ];
                continue;
            }
            $rowNumbersByCode[$normalizedCode] = $record['row_number'];
            $employeeCodes[] = $code;

            foreach (['ot_hours'] as $field) {
                if ($record[$field] === '' || !is_numeric($record[$field]) || !is_finite((float) $record[$field])) {
                    $inputErrors[] = [
                        'row_number' => $record['row_number'],
                        'message' => "{$field} phải là số hợp lệ",
                    ];
                    continue;
                }
                if ((float) $record[$field] < 0) {
                    $inputErrors[] = [
                        'row_number' => $record['row_number'],
                        'message' => "{$field} không được âm",
                    ];
                }
            }
            [$reasonError] = PayrollChangePolicy::validateReason($record['reason'] ?? null);
            if ($reasonError !== null) {
                $inputErrors[] = [
                    'row_number' => $record['row_number'],
                    'message' => $reasonError,
                ];
            }
        }

        if ($inputErrors !== []) {
            return json_response(422, ['errors' => $inputErrors], 'File Excel có dữ liệu không hợp lệ');
        }

        $model = new PayrollModel();
        $usersByCode = [];
        foreach ($model->getUsersByEmployeeCodes($employeeCodes) as $code => $userId) {
            $usersByCode[strtoupper($code)] = $userId;
        }

        $entries = [];
        $unknownCodes = [];
        $rowNumbersByUserId = [];
        foreach ($records as $record) {
            $normalizedCode = strtoupper($record['employee_code']);
            if (!isset($usersByCode[$normalizedCode])) {
                $unknownCodes[] = [
                    'row_number' => $record['row_number'],
                    'employee_code' => $record['employee_code'],
                ];
                continue;
            }
            $entries[] = [
                'user_id' => $usersByCode[$normalizedCode],
                'ot_hours' => $record['ot_hours'],
                'reason' => $record['reason'],
            ];
            $rowNumbersByUserId[$usersByCode[$normalizedCode]] = $record['row_number'];
        }
        if ($unknownCodes !== []) {
            return json_response(422, ['unknown_employees' => $unknownCodes], 'File Excel có mã nhân viên không tồn tại');
        }

        return $this->saveAttendanceEntries($periodId, $entries, true, $rowNumbersByUserId);
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
        if (!$model->getPeriodById($periodId)) {
            json_response(404, null, 'Không tìm thấy kỳ lương');
            return;
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
            $reasons = $input['reasons'] ?? null;
            if (!is_array($reasons)) {
                return json_response(422, null, 'reasons phải chứa lý do riêng theo từng user_id');
            }
            $result = (new PayrollRunService())->run($periodId, $reasons, (int) $_SESSION['user_id']);
            $result['items'] = array_map([$this, 'formatPayrollItem'], $result['items']);
            json_response(200, $result, 'Đã chạy và lưu bảng lương cho toàn kỳ');
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
            $result = (new PayrollPeriodService())->lock($periodId);
            $result['items'] = array_map([$this, 'formatPayrollItem'], $result['items']);
            json_response(200, $result, 'Đã khóa sổ kỳ lương');
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

    public function calculateAndSave()
    {
        header('Content-Type: application/json; charset=UTF-8');

        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            header('Allow: POST');
            return $this->respond(405, null, 'Phương thức không được hỗ trợ');
        }

        if (!isset($_SESSION['user_id'])) {
            return $this->respond(401, null, 'Chưa đăng nhập');
        }

        if (($_SESSION['role'] ?? null) !== 'ADMIN') {
            return $this->respond(403, null, 'Không có quyền thực hiện');
        }

        $input = read_json_body();
        if ($input === null) {
            return $this->respond(400, null, 'Dữ liệu JSON không hợp lệ');
        }

        $userId = filter_var($input['user_id'] ?? null, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1],
        ]);
        $periodId = filter_var($input['period_id'] ?? null, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1],
        ]);
        if ($userId === false || $periodId === false) {
            return $this->respond(400, null, 'user_id và period_id phải là số nguyên dương');
        }

        if (array_key_exists('actual_days', $input)) {
            return $this->respond(422, null, 'actual_days được tính từ chấm công theo ngày, không thể nhập thủ công');
        }
        if (!isset($input['ot_hours']) || !is_numeric($input['ot_hours']) || !is_finite((float) $input['ot_hours'])) {
            return $this->respond(400, null, 'ot_hours phải là một số hợp lệ');
        }
        if ((float) $input['ot_hours'] < 0) {
            return $this->respond(400, null, 'ot_hours không được âm');
        }

        try {
            $result = (new AttendanceService())->save($periodId, [[
                'user_id' => $userId,
                'ot_hours' => $input['ot_hours'],
                'reason' => $input['reason'] ?? null,
            ]], (int) $_SESSION['user_id']);

            return $this->respond(200, [
                'user_id' => $userId,
                'period' => $result['period'],
                'calculation' => $result['calculations'][$userId],
            ], 'Đã tính và lưu bảng lương');
        } catch (AttendanceException $e) {
            return $this->respond($e->statusCode, $e->details ?: null, $e->getMessage());
        } catch (PDOException $e) {
            error_log($e->getMessage());
            return $this->respond(500, null, 'Không thể xử lý bảng lương do lỗi cơ sở dữ liệu');
        }
    }

    private function respond($statusCode, $data, $message)
    {
        http_response_code($statusCode);
        echo json_encode([
            'success' => $statusCode >= 200 && $statusCode < 300,
            'data' => $data,
            'message' => $message,
        ]);
    }

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

        $standardDays = filter_var($input['standard_days'] ?? null, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1, 'max_range' => 31],
        ]);
        if ($standardDays === false) {
            return json_response(422, null, 'standard_days phải là số nguyên từ 1 đến 31');
        }

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

    private function saveAttendance()
    {
        $input = read_json_body();
        if ($input === null) {
            return json_response(400, null, 'Dữ liệu JSON không hợp lệ');
        }

        $periodId = filter_var($input['period_id'] ?? null, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1],
        ]);
        if ($periodId === false) {
            return json_response(400, null, 'Thiếu hoặc sai tham số period_id');
        }
        if (!isset($input['entries']) || !is_array($input['entries'])) {
            return json_response(422, null, 'entries phải là danh sách ngày công');
        }

        $this->saveAttendanceEntries($periodId, $input['entries']);
    }

    private function saveAttendanceEntries(
        int $periodId,
        array $entries,
        bool $isImport = false,
        array $rowNumbersByUserId = []
    ) {
        try {
            $result = (new AttendanceService())->save($periodId, $entries, (int) $_SESSION['user_id']);
            $result['items'] = array_map([$this, 'formatAttendanceRow'], $result['items']);
            if ($isImport) {
                $result['imported_count'] = $result['updated_count'];
            }
            json_response(200, $result, $isImport ? 'Đã nhập OT từ Excel' : 'Đã lưu OT và tính lương theo ngày công thực tế');
        } catch (AttendanceException $e) {
            $details = $e->details;
            if ($isImport && isset($details['user_ids'])) {
                $details['row_numbers'] = array_values(array_filter(array_map(
                    static function (int $userId) use ($rowNumbersByUserId): ?int {
                        return $rowNumbersByUserId[$userId] ?? null;
                    },
                    $details['user_ids']
                )));
            }
            if ($isImport && isset($details['entry_index'])) {
                $userId = $entries[$details['entry_index']]['user_id'] ?? null;
                if ($userId !== null && isset($rowNumbersByUserId[$userId])) {
                    $details['row_number'] = $rowNumbersByUserId[$userId];
                }
            }
            json_response($e->statusCode, $details ?: null, $e->getMessage());
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
