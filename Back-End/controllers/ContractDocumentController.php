<?php

require_once __DIR__ . '/../services/ContractSchema.php';
require_once __DIR__ . '/../services/ContractTemplate.php';
require_once __DIR__ . '/../services/ContractIntake.php';
require_once __DIR__ . '/../services/ContractValidator.php';

/**
 * Hồ sơ hợp đồng (ADMIN / nhân sự).
 * Tài khoản nhân viên CHỈ được tạo khi duyệt một hồ sơ hợp đồng hợp lệ, đủ thông tin và có bản scan đối chiếu.
 */
class ContractDocumentController
{
    private const DEFAULT_PASSWORD = '123456';

    /** GET contracts/template — mẫu hợp đồng trống. */
    public function template()
    {
        if (!require_method('GET') || !require_auth('ADMIN')) {
            return;
        }
        $bytes = ContractTemplate::build([
            'employer_representative' => ContractSchema::COMPANY['representative'],
            'working_hours_per_day' => '8',
            'working_days_per_week' => '5',
            'annual_leave_days' => '12',
            'payment_method' => 'Chuyển khoản',
            'pay_day' => '10',
        ]);
        header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        header('Content-Disposition: attachment; filename="Mau-hop-dong-lao-dong-PeopleOS.docx"');
        header('Content-Length: ' . strlen($bytes));
        header('Cache-Control: no-store');
        echo $bytes;
    }

    /** GET contracts/documents?status= */
    public function index()
    {
        if (!require_method('GET') || !require_auth('ADMIN')) {
            return;
        }
        $status = $_GET['status'] ?? null;
        $rows = (new ContractDocumentModel())->all(is_string($status) && $status !== '' ? $status : null);
        json_response(200, array_map(fn ($r) => $this->format($r, false), $rows), 'Lấy danh sách hồ sơ hợp đồng thành công');
    }

    /** GET contracts/documents/show?id= */
    public function show()
    {
        if (!require_method('GET') || !require_auth('ADMIN')) {
            return;
        }
        $doc = (new ContractDocumentModel())->find((int) ($_GET['id'] ?? 0));
        if (!$doc) {
            return json_response(404, null, 'Không tìm thấy hồ sơ hợp đồng');
        }
        json_response(200, $this->format($doc, true), 'Lấy hồ sơ hợp đồng thành công');
    }

    /** POST contracts/documents/upload (multipart: contract, scan?, application_id?) */
    public function upload()
    {
        if (!require_method('POST') || !require_auth('ADMIN')) {
            return;
        }
        $applicationId = (int) ($_POST['application_id'] ?? 0) ?: null;
        $expect = [];
        if ($applicationId) {
            $app = (new JobApplicationModel())->find($applicationId);
            if (!$app || !in_array($app['status'], ['APPROVED', 'CONTRACT_SUBMITTED'], true)) {
                return json_response(409, null, 'Hồ sơ ứng tuyển chưa được duyệt hoặc đã hoàn tất');
            }
            $expect = ['email' => $app['email'], 'national_id' => $app['national_id'], 'branch_id' => $app['branch_id']];
        }
        try {
            [$id] = ContractIntake::handle($_FILES['contract'] ?? null, $_FILES['scan'] ?? null, 'HR', $applicationId, (int) $_SESSION['user_id'], $expect);
        } catch (ContractIntakeException $e) {
            return json_response($e->status, $e->payload, $e->getMessage());
        }
        if ($applicationId) {
            (new JobApplicationModel())->setStatus($applicationId, 'CONTRACT_SUBMITTED');
        }
        json_response(201, $this->format((new ContractDocumentModel())->find($id), true), 'Đã đọc và lưu hợp đồng — kiểm tra lại thông tin rồi duyệt');
    }

    /** POST contracts/documents/scan (multipart: id, scan) — nhân sự bổ sung bản scan đã đối chiếu. */
    public function attachScan()
    {
        if (!require_method('POST') || !require_auth('ADMIN')) {
            return;
        }
        $model = new ContractDocumentModel();
        $doc = $model->find((int) ($_POST['id'] ?? 0));
        if (!$doc) {
            return json_response(404, null, 'Không tìm thấy hồ sơ hợp đồng');
        }
        if ($doc['status'] !== 'PENDING_REVIEW') {
            return json_response(409, null, 'Hồ sơ đã được xử lý');
        }
        if (empty($_FILES['scan']) || $_FILES['scan']['error'] === UPLOAD_ERR_NO_FILE) {
            return json_response(422, null, 'Chưa chọn bản scan');
        }
        try {
            [$name, $path] = ContractIntake::storeScan($_FILES['scan']);
        } catch (ContractIntakeException $e) {
            return json_response($e->status, null, $e->getMessage());
        }
        if ($doc['scan_path']) {
            @unlink(ContractIntake::storageDir() . basename($doc['scan_path']));
        }
        $model->attachScan((int) $doc['id'], $name, $path);
        json_response(200, $this->format($model->find((int) $doc['id']), true), 'Đã cập nhật bản scan');
    }

    /** GET contracts/documents/file?id=&kind=scan|docx */
    public function file()
    {
        if (!require_method('GET') || !require_auth('ADMIN')) {
            return;
        }
        $doc = (new ContractDocumentModel())->find((int) ($_GET['id'] ?? 0));
        $kind = ($_GET['kind'] ?? 'docx') === 'scan' ? 'scan' : 'docx';
        $stored = $doc ? ($kind === 'scan' ? $doc['scan_path'] : $doc['stored_path']) : null;
        $path = $stored ? ContractIntake::storageDir() . basename($stored) : null;
        if (!$path || !is_file($path)) {
            return json_response(404, null, 'Không tìm thấy file');
        }
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $mime = ['pdf' => 'application/pdf', 'jpg' => 'image/jpeg', 'png' => 'image/png',
                 'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'][$ext] ?? 'application/octet-stream';
        $name = $kind === 'scan' ? $doc['scan_filename'] : $doc['original_filename'];
        header('Content-Type: ' . $mime);
        header('Content-Disposition: ' . ($kind === 'scan' ? 'inline' : 'attachment') . '; filename="' . rawurlencode($name) . '"');
        header('Content-Length: ' . filesize($path));
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: private, no-store');
        readfile($path);
    }

    /** POST contracts/documents/approve { id, note } — tạo tài khoản + hợp đồng từ dữ liệu đã đọc. */
    public function approve()
    {
        if (!require_method('POST') || !require_auth('ADMIN')) {
            return;
        }
        $in = read_json_body() ?? [];
        $id = (int) ($in['id'] ?? 0);
        $note = mb_substr(trim((string) ($in['note'] ?? '')), 0, 500) ?: null;
        $docs = new ContractDocumentModel();
        $users = new UserModel();

        try {
            $docs->beginTransaction();
            $doc = $docs->find($id, true);
            if (!$doc) {
                $docs->rollBack();
                return json_response(404, null, 'Không tìm thấy hồ sơ hợp đồng');
            }
            if ($doc['status'] !== 'PENDING_REVIEW') {
                $docs->rollBack();
                return json_response(409, null, 'Hồ sơ đã được xử lý');
            }
            if (!$doc['scan_path']) {
                $docs->rollBack();
                return json_response(422, null, 'Cần tải lên bản scan hợp đồng có chữ ký trước khi duyệt');
            }
            $raw = json_decode($doc['extracted_data'], true)['raw'] ?? [];
            $expect = [];
            if ($doc['application_id']) {
                $app = (new JobApplicationModel())->find((int) $doc['application_id']);
                $expect = $app ? ['email' => $app['email'], 'national_id' => $app['national_id']] : [];
            }
            // Kiểm tra lại tại thời điểm duyệt (VD CCCD/email vừa bị trùng).
            $result = (new ContractValidator())->validate($raw, $expect);
            $docs->updateValidation($id, json_encode(ContractIntake::summary($result), JSON_UNESCAPED_UNICODE));
            if (!$result['complete']) {
                $docs->commit();
                return json_response(422, ['validation' => ContractIntake::summary($result)],
                    $result['ok'] ? 'Hợp đồng còn thiếu thông tin bắt buộc — chưa thể tạo tài khoản' : 'Hợp đồng có nội dung vi phạm — không thể duyệt');
            }

            $d = $result['data'];
            $d['employee_code'] = $d['employee_code'] ?: $users->nextEmployeeCode();
            $d['password'] = self::DEFAULT_PASSWORD;
            (new BranchModel())->ensureDepartment($d['department']);
            $userId = $users->createFromContract($d);
            (new ContractModel())->createFromDocument($userId, $d, $id);
            $docs->review($id, 'APPROVED', (int) $_SESSION['user_id'], $note, $userId);
            if ($doc['application_id']) {
                (new JobApplicationModel())->setStatus((int) $doc['application_id'], 'HIRED', $userId);
            }
            $docs->commit();
        } catch (Throwable $e) {
            $docs->rollBack();
            throw $e;
        }

        json_response(201, [
            'document' => $this->format($docs->find($id), true),
            'account' => ['id' => $userId, 'employee_code' => $d['employee_code'], 'email' => $d['email'], 'default_password' => self::DEFAULT_PASSWORD],
        ], 'Đã duyệt hợp đồng và tạo tài khoản ' . $d['employee_code']);
    }

    /** POST contracts/documents/reject { id, note } */
    public function reject()
    {
        if (!require_method('POST') || !require_auth('ADMIN')) {
            return;
        }
        $in = read_json_body() ?? [];
        $note = trim((string) ($in['note'] ?? ''));
        if ($note === '') {
            return json_response(422, null, 'Vui lòng ghi lý do từ chối');
        }
        $docs = new ContractDocumentModel();
        $doc = $docs->find((int) ($in['id'] ?? 0));
        if (!$doc) {
            return json_response(404, null, 'Không tìm thấy hồ sơ hợp đồng');
        }
        if ($doc['status'] !== 'PENDING_REVIEW') {
            return json_response(409, null, 'Hồ sơ đã được xử lý');
        }
        $docs->review((int) $doc['id'], 'REJECTED', (int) $_SESSION['user_id'], mb_substr($note, 0, 500));
        // Ứng viên được nộp lại qua link cũ.
        if ($doc['application_id']) {
            (new JobApplicationModel())->setStatus((int) $doc['application_id'], 'APPROVED');
        }
        json_response(200, $this->format($docs->find((int) $doc['id']), true), 'Đã từ chối hồ sơ hợp đồng');
    }

    private function format(array $d, bool $full): array
    {
        $extracted = json_decode($d['extracted_data'], true) ?: [];
        $data = $extracted['data'] ?? [];
        $out = [
            'id' => (int) $d['id'],
            'application_id' => $d['application_id'] !== null ? (int) $d['application_id'] : null,
            'user_id' => $d['user_id'] !== null ? (int) $d['user_id'] : null,
            'hired_employee_code' => $d['hired_employee_code'],
            'contract_number' => $d['contract_number'],
            'source' => $d['source'],
            'status' => $d['status'],
            'full_name' => $data['full_name'] ?? $d['applicant_name'],
            'email' => $data['email'] ?? $d['applicant_email'],
            'position' => $data['position'] ?? null,
            'department' => $data['department'] ?? null,
            'base_salary' => $data['base_salary'] ?? null,
            'original_filename' => $d['original_filename'],
            'scan_filename' => $d['scan_filename'],
            'has_scan' => $d['scan_path'] !== null,
            'uploader_name' => $d['uploader_name'],
            'reviewer_name' => $d['reviewer_name'],
            'reviewed_at' => $d['reviewed_at'],
            'review_note' => $d['review_note'],
            'created_at' => $d['created_at'],
            'validation' => json_decode($d['validation'], true),
        ];
        if ($full) {
            $out['extracted'] = $data;
            $out['raw'] = $extracted['raw'] ?? [];
        }
        return $out;
    }
}
