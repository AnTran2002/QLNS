<?php

require_once __DIR__ . '/../services/ContractSchema.php';
require_once __DIR__ . '/../services/ContractTemplate.php';
require_once __DIR__ . '/../services/ContractIntake.php';
require_once __DIR__ . '/../services/PayrollConfig.php';

/**
 * Tuyển dụng: ứng viên nộp hồ sơ (công khai) → quản trị duyệt + gửi thư mời kèm link hợp đồng (EmailJS ở Front-End)
 * → ứng viên tải mẫu hợp đồng đã điền sẵn, hoàn thiện, tải lên → nhân sự đối chiếu bản scan và duyệt tạo tài khoản.
 */
class RecruitmentController
{
    public const EDUCATION = ['Trung học phổ thông', 'Trung cấp', 'Cao đẳng', 'Đại học', 'Thạc sĩ', 'Tiến sĩ'];
    private const TOKEN_DAYS = 14;
    private const APPLY_LIMIT_PER_HOUR = 5;

    /* ============================================================ công khai */

    /** POST recruitment/apply */
    public function apply()
    {
        if (!require_method('POST')) {
            return;
        }
        $recent = array_filter($_SESSION['apply_times'] ?? [], fn ($t) => $t > time() - 3600);
        if (count($recent) >= self::APPLY_LIMIT_PER_HOUR) {
            return json_response(429, null, 'Bạn đã gửi quá nhiều hồ sơ, vui lòng thử lại sau');
        }

        $in = read_json_body();
        if ($in === null) {
            return json_response(422, null, 'Dữ liệu JSON không hợp lệ');
        }
        $t = fn ($k) => trim((string) ($in[$k] ?? ''));
        $errors = [];

        $d = [
            'full_name' => preg_replace('/\s+/u', ' ', $t('full_name')),
            'email' => mb_strtolower($t('email')),
            'phone' => preg_replace('/^\+84/', '0', preg_replace('/[^\d+]/', '', $t('phone'))),
            'date_of_birth' => $t('date_of_birth'),
            'gender' => $t('gender'),
            'national_id' => preg_replace('/\s+/', '', $t('national_id')),
            'address' => $t('address'),
            'branch_id' => (int) ($in['branch_id'] ?? 0),
            'department' => $t('department'),
            'position' => $t('position'),
            'education' => $t('education'),
            'experience_years' => (float) ($in['experience_years'] ?? 0),
            'expected_salary' => (float) preg_replace('/[^\d.]/', '', (string) ($in['expected_salary'] ?? '0')),
            'available_from' => $t('available_from'),
            'introduction' => mb_substr($t('introduction'), 0, 2000) ?: null,
        ];

        foreach (['full_name' => 'Họ và tên', 'email' => 'Email', 'phone' => 'Số điện thoại', 'date_of_birth' => 'Ngày sinh', 'gender' => 'Giới tính',
                     'national_id' => 'Số CCCD', 'address' => 'Địa chỉ', 'department' => 'Phòng ban', 'position' => 'Vị trí ứng tuyển',
                     'education' => 'Trình độ', 'available_from' => 'Ngày có thể đi làm'] as $k => $label) {
            if ($d[$k] === '') {
                $errors[$k] = "{$label} không được để trống";
            }
        }
        if (mb_strlen($d['full_name']) > 100 || mb_strlen($d['address']) > 255 || mb_strlen($d['position']) > 100 || mb_strlen($d['department']) > 100) {
            $errors['full_name'] ??= 'Thông tin quá dài';
        }
        if ($d['email'] !== '' && !filter_var($d['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Email không hợp lệ';
        }
        if ($d['phone'] !== '' && !preg_match('/^0\d{9}$/', $d['phone'])) {
            $errors['phone'] = 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0';
        }
        if ($d['national_id'] !== '' && !preg_match('/^\d{12}$/', $d['national_id'])) {
            $errors['national_id'] = 'Số CCCD phải gồm 12 chữ số';
        }
        if ($d['gender'] !== '' && !in_array($d['gender'], ContractSchema::GENDERS, true)) {
            $errors['gender'] = 'Giới tính không hợp lệ';
        }
        if ($d['education'] !== '' && !in_array($d['education'], self::EDUCATION, true)) {
            $errors['education'] = 'Trình độ không hợp lệ';
        }
        if ($d['date_of_birth'] !== '') {
            if (!self::isDate($d['date_of_birth'])) {
                $errors['date_of_birth'] = 'Ngày sinh không hợp lệ';
            } else {
                $age = (new DateTimeImmutable($d['date_of_birth']))->diff(new DateTimeImmutable())->y;
                if ($age < 18) {
                    $errors['date_of_birth'] = 'Ứng viên phải đủ 18 tuổi (Điều 143 BLLĐ 2019 hạn chế lao động chưa thành niên)';
                } elseif ($age > 70) {
                    $errors['date_of_birth'] = 'Ngày sinh không hợp lệ';
                }
            }
        }
        if ($d['available_from'] !== '' && (!self::isDate($d['available_from']) || $d['available_from'] < date('Y-m-d'))) {
            $errors['available_from'] = 'Ngày có thể đi làm phải từ hôm nay trở đi';
        }
        if ($d['experience_years'] < 0 || $d['experience_years'] > 50) {
            $errors['experience_years'] = 'Số năm kinh nghiệm không hợp lệ';
        }
        $branch = $d['branch_id'] ? (new BranchModel())->find($d['branch_id']) : null;
        if (!$branch) {
            $errors['branch_id'] = 'Vui lòng chọn chi nhánh';
        }
        $minimum = PayrollConfig::REGIONAL_MINIMUM_WAGE[$branch['region'] ?? 'I'];
        if ($d['expected_salary'] <= 0 || $d['expected_salary'] > 1_000_000_000) {
            $errors['expected_salary'] = 'Mức lương mong muốn không hợp lệ';
        } elseif ($d['expected_salary'] < $minimum) {
            $errors['expected_salary'] = 'Mức lương mong muốn thấp hơn lương tối thiểu vùng ' . ($branch['region'] ?? 'I') . ' (' . number_format($minimum, 0, ',', '.') . 'đ)';
        }
        if (($in['agree_terms'] ?? false) !== true) {
            $errors['agree_terms'] = 'Bạn cần đồng ý điều khoản tuyển dụng và xử lý dữ liệu cá nhân';
        }
        if ($errors) {
            return json_response(422, ['errors' => $errors], reset($errors));
        }

        $model = new JobApplicationModel();
        if ($model->hasOpenApplication($d['email'], $d['national_id'])) {
            return json_response(409, null, 'Bạn đã có hồ sơ đang được xử lý — vui lòng chờ phản hồi qua email');
        }
        if ((new UserModel())->existsNationalId($d['national_id'])) {
            return json_response(409, null, 'Số CCCD này đã là nhân viên của công ty');
        }

        $id = $model->create($d);
        $_SESSION['apply_times'] = [...$recent, time()];
        json_response(201, ['id' => $id, 'status' => 'PENDING'], 'Đã gửi hồ sơ ứng tuyển. Bộ phận nhân sự sẽ phản hồi qua email ' . $d['email']);
    }

    /** GET recruitment/offer?token= — Thư mời + trạng thái hồ sơ cho ứng viên. */
    public function offer()
    {
        if (!require_method('GET')) {
            return;
        }
        [$app, $error] = $this->appFromToken($_GET['token'] ?? '');
        if ($error) {
            return json_response($error[0], null, $error[1]);
        }
        $doc = (new ContractDocumentModel())->pendingForApplication((int) $app['id']);
        json_response(200, [
            'full_name' => $app['full_name'],
            'email' => $app['email'],
            'position' => $app['position'],
            'department' => $app['department'],
            'branch' => ['code' => $app['branch_code'], 'name' => $app['branch_name'], 'region' => $app['branch_region']],
            'status' => $app['status'],
            'review_note' => $app['review_note'],
            'token_expires_at' => $app['token_expires_at'],
            'offer' => [
                'base_salary' => (float) $app['offer_base_salary'],
                'allowance' => (float) $app['offer_allowance'],
                'start_date' => $app['offer_start_date'],
                'contract_type' => $app['offer_contract_type'],
                'contract_type_label' => ContractSchema::CONTRACT_TYPES[$app['offer_contract_type']] ?? null,
                'probation_days' => (int) $app['offer_probation_days'],
            ],
            'submitted' => $doc ? [
                'id' => (int) $doc['id'],
                'created_at' => $doc['created_at'],
                'has_scan' => $doc['scan_path'] !== null,
                'validation' => json_decode($doc['validation'], true),
            ] : null,
            'company' => ContractSchema::COMPANY,
        ], 'Lấy thư mời thành công');
    }

    /** GET recruitment/offer/template?token= — Mẫu hợp đồng điền sẵn thông tin ứng viên + thư mời. */
    public function offerTemplate()
    {
        if (!require_method('GET')) {
            return;
        }
        [$app, $error] = $this->appFromToken($_GET['token'] ?? '');
        if ($error) {
            return json_response($error[0], null, $error[1]);
        }
        $fmt = fn ($date) => $date ? date('d/m/Y', strtotime($date)) : '';
        $money = fn ($v) => $v !== null ? number_format((float) $v, 0, ',', '.') : '';
        $start = $app['offer_start_date'];
        $prefill = [
            'full_name' => $app['full_name'],
            'date_of_birth' => $fmt($app['date_of_birth']),
            'gender' => $app['gender'],
            'national_id' => $app['national_id'],
            'address' => $app['address'],
            'phone' => $app['phone'],
            'email' => $app['email'],
            'dependents_count' => '0',
            'contract_number' => sprintf('%03d/%s/HĐLĐ-PEOPLEOS', $app['id'], date('Y')),
            'contract_type' => ContractSchema::CONTRACT_TYPES[$app['offer_contract_type']] ?? '',
            'start_date' => $fmt($start),
            'end_date' => $app['offer_contract_type'] === 'FIXED_TERM' && $start
                ? date('d/m/Y', strtotime($start . ' +12 months -1 day')) : '',
            'branch' => $app['branch_code'],
            'department' => $app['department'],
            'position' => $app['position'],
            'qualification' => in_array($app['education'], ['Cao đẳng', 'Đại học', 'Thạc sĩ', 'Tiến sĩ'], true)
                ? ContractSchema::QUALIFICATIONS['HIGH_SKILL']
                : ($app['education'] === 'Trung cấp' ? ContractSchema::QUALIFICATIONS['MID_SKILL'] : ContractSchema::QUALIFICATIONS['OTHER']),
            'probation_days' => (string) (int) $app['offer_probation_days'],
            'probation_salary_rate' => (int) $app['offer_probation_days'] > 0 ? '85%' : '',
            'working_hours_per_day' => '8',
            'working_days_per_week' => '5',
            'annual_leave_days' => '12',
            'base_salary' => $money($app['offer_base_salary']),
            'allowance' => $money($app['offer_allowance']),
            'insurance_salary' => $money($app['offer_base_salary']),
            'payment_method' => 'Chuyển khoản',
            'pay_day' => '10',
            'employer_representative' => ContractSchema::COMPANY['representative'],
        ];
        $this->sendDocx(ContractTemplate::build($prefill), 'Hop-dong-lao-dong-' . $this->slug($app['full_name']) . '.docx');
    }

    /** POST recruitment/offer/upload (multipart: token, contract, scan?) */
    public function offerUpload()
    {
        if (!require_method('POST')) {
            return;
        }
        [$app, $error] = $this->appFromToken($_POST['token'] ?? '');
        if ($error) {
            return json_response($error[0], null, $error[1]);
        }
        $docs = new ContractDocumentModel();
        if ($docs->pendingForApplication((int) $app['id'])) {
            return json_response(409, null, 'Bạn đã nộp hợp đồng — đang chờ nhân sự kiểm tra');
        }
        try {
            [$id, $validation] = ContractIntake::handle(
                $_FILES['contract'] ?? null,
                $_FILES['scan'] ?? null,
                'APPLICANT',
                (int) $app['id'],
                null,
                ['email' => $app['email'], 'national_id' => $app['national_id'], 'branch_id' => $app['branch_id'], 'base_salary' => $app['offer_base_salary']]
            );
        } catch (ContractIntakeException $e) {
            return json_response($e->status, $e->payload, $e->getMessage());
        }
        (new JobApplicationModel())->setStatus((int) $app['id'], 'CONTRACT_SUBMITTED');
        json_response(201, ['document_id' => $id, 'validation' => $validation],
            $validation['complete'] ? 'Đã nộp hợp đồng. Nhân sự sẽ đối chiếu bản scan và tạo tài khoản cho bạn.' : 'Đã nộp hợp đồng nhưng còn thiếu thông tin — nhân sự sẽ liên hệ bổ sung.');
    }

    /* ============================================================ quản trị */

    /** GET recruitment/applications?status= */
    public function applications()
    {
        if (!require_method('GET') || !require_auth('ADMIN')) {
            return;
        }
        $status = $_GET['status'] ?? null;
        $rows = (new JobApplicationModel())->all(is_string($status) && $status !== '' ? $status : null);
        json_response(200, array_map([$this, 'format'], $rows), 'Lấy danh sách hồ sơ ứng tuyển thành công');
    }

    /** POST recruitment/review { id, decision: APPROVE|REJECT, note, offer{} } */
    public function review()
    {
        if (!require_method('POST') || !require_auth('ADMIN')) {
            return;
        }
        $in = read_json_body() ?? [];
        $id = (int) ($in['id'] ?? 0);
        $model = new JobApplicationModel();
        $app = $id ? $model->find($id) : null;
        if (!$app) {
            return json_response(404, null, 'Không tìm thấy hồ sơ');
        }
        $note = trim((string) ($in['note'] ?? '')) ?: null;
        $reviewer = (int) $_SESSION['user_id'];

        if (($in['decision'] ?? '') === 'REJECT') {
            if (!$note) {
                return json_response(422, null, 'Vui lòng ghi lý do từ chối');
            }
            if (!$model->reject($id, $reviewer, mb_substr($note, 0, 500))) {
                return json_response(409, null, 'Hồ sơ đã được xử lý xong, không thể từ chối');
            }
            return json_response(200, $this->format($model->find($id)), 'Đã từ chối hồ sơ');
        }
        if (($in['decision'] ?? '') !== 'APPROVE') {
            return json_response(422, null, 'decision phải là APPROVE hoặc REJECT');
        }

        $o = is_array($in['offer'] ?? null) ? $in['offer'] : [];
        $offer = [
            'base_salary' => (float) ($o['base_salary'] ?? $app['expected_salary']),
            'allowance' => (float) ($o['allowance'] ?? 0),
            'start_date' => (string) ($o['start_date'] ?? $app['available_from']),
            'contract_type' => (string) ($o['contract_type'] ?? 'FIXED_TERM'),
            'probation_days' => (int) ($o['probation_days'] ?? 60),
        ];
        $minimum = PayrollConfig::REGIONAL_MINIMUM_WAGE[$app['branch_region']] ?? PayrollConfig::REGIONAL_MINIMUM_WAGE['I'];
        if ($offer['base_salary'] < $minimum) {
            return json_response(422, null, 'Mức lương đề nghị thấp hơn lương tối thiểu vùng ' . $app['branch_region'] . ' (' . number_format($minimum, 0, ',', '.') . 'đ)');
        }
        if ($offer['allowance'] < 0) {
            return json_response(422, null, 'Phụ cấp không được âm');
        }
        if (!self::isDate($offer['start_date']) || $offer['start_date'] < date('Y-m-d')) {
            return json_response(422, null, 'Ngày bắt đầu phải từ hôm nay trở đi');
        }
        if (!isset(ContractSchema::CONTRACT_TYPES[$offer['contract_type']])) {
            return json_response(422, null, 'Loại hợp đồng không hợp lệ');
        }
        $maxProbation = max(PayrollConfig::MAX_PROBATION_DAYS);
        if ($offer['probation_days'] < 0 || $offer['probation_days'] > $maxProbation) {
            return json_response(422, null, "Thời gian thử việc 0–{$maxProbation} ngày (Điều 25 BLLĐ 2019)");
        }

        $token = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', strtotime('+' . self::TOKEN_DAYS . ' days'));
        if (!$model->approve($id, $reviewer, $offer, $token, $expires, $note)) {
            return json_response(409, null, 'Chỉ duyệt được hồ sơ đang chờ hoặc đã duyệt (gửi lại link)');
        }
        json_response(200, $this->format($model->find($id), true), 'Đã duyệt hồ sơ — hãy gửi email link hợp đồng cho ứng viên');
    }

    /** POST recruitment/mark-emailed { id } — Front-End gọi sau khi EmailJS gửi thành công. */
    public function markEmailed()
    {
        if (!require_method('POST') || !require_auth('ADMIN')) {
            return;
        }
        $id = (int) ((read_json_body() ?? [])['id'] ?? 0);
        $model = new JobApplicationModel();
        $app = $id ? $model->find($id) : null;
        if (!$app || !$app['contract_token']) {
            return json_response(404, null, 'Không tìm thấy hồ sơ đã duyệt');
        }
        $model->markEmailed($id);
        json_response(200, $this->format($model->find($id)), 'Đã ghi nhận gửi email');
    }

    /* ============================================================ hỗ trợ */

    private function appFromToken($token): array
    {
        if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/', $token)) {
            return [null, [400, 'Link hợp đồng không hợp lệ']];
        }
        $app = (new JobApplicationModel())->findByToken($token);
        if (!$app) {
            return [null, [404, 'Link hợp đồng không tồn tại hoặc đã bị thu hồi']];
        }
        if (strtotime($app['token_expires_at']) < time()) {
            return [null, [410, 'Link hợp đồng đã hết hạn — vui lòng liên hệ bộ phận nhân sự']];
        }
        if (!in_array($app['status'], ['APPROVED', 'CONTRACT_SUBMITTED'], true)) {
            return [null, [409, $app['status'] === 'HIRED' ? 'Hồ sơ đã hoàn tất, tài khoản đã được tạo' : 'Hồ sơ không còn hiệu lực']];
        }
        return [$app, null];
    }

    private function format(array $a, bool $withToken = false): array
    {
        return [
            'id' => (int) $a['id'],
            'full_name' => $a['full_name'],
            'email' => $a['email'],
            'phone' => $a['phone'],
            'date_of_birth' => $a['date_of_birth'],
            'gender' => $a['gender'],
            'national_id' => $a['national_id'],
            'address' => $a['address'],
            'branch' => ['id' => (int) $a['branch_id'], 'code' => $a['branch_code'], 'name' => $a['branch_name'], 'region' => $a['branch_region']],
            'department' => $a['department'],
            'position' => $a['position'],
            'education' => $a['education'],
            'experience_years' => (float) $a['experience_years'],
            'expected_salary' => (float) $a['expected_salary'],
            'available_from' => $a['available_from'],
            'introduction' => $a['introduction'],
            'agreed_terms_at' => $a['agreed_terms_at'],
            'status' => $a['status'],
            'review_note' => $a['review_note'],
            'reviewer_name' => $a['reviewer_name'],
            'reviewed_at' => $a['reviewed_at'],
            'offer' => $a['offer_base_salary'] !== null ? [
                'base_salary' => (float) $a['offer_base_salary'],
                'allowance' => (float) $a['offer_allowance'],
                'start_date' => $a['offer_start_date'],
                'contract_type' => $a['offer_contract_type'],
                'probation_days' => (int) $a['offer_probation_days'],
            ] : null,
            // Admin cần token để gửi lại link; chỉ trả cho admin.
            'contract_token' => $a['contract_token'],
            'token_expires_at' => $a['token_expires_at'],
            'email_sent_at' => $a['email_sent_at'],
            'hired_user_id' => $a['hired_user_id'] !== null ? (int) $a['hired_user_id'] : null,
            'created_at' => $a['created_at'],
        ];
    }

    private function sendDocx(string $bytes, string $filename): void
    {
        header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . strlen($bytes));
        header('Cache-Control: no-store');
        echo $bytes;
    }

    private function slug(string $s): string
    {
        return trim(preg_replace('/[^A-Za-z0-9]+/', '-', ContractSchema::stripDiacritics(mb_strtolower($s, 'UTF-8'))), '-');
    }

    public static function isDate(string $s): bool
    {
        $d = DateTime::createFromFormat('Y-m-d', $s);
        return $d && $d->format('Y-m-d') === $s;
    }
}
