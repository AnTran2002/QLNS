<?php

require_once __DIR__ . '/ContractSchema.php';
require_once __DIR__ . '/PayrollConfig.php';
require_once __DIR__ . '/../models/BaseModel.php';

/**
 * Chuẩn hoá + kiểm tra hợp đồng lao động theo Bộ luật Lao động 2019 và văn bản hướng dẫn.
 *
 * Kết quả:
 *  - missing  : trường bắt buộc bị trống → CẢNH BÁO, chưa được duyệt tạo tài khoản
 *  - errors   : vi phạm pháp luật / dữ liệu sai → TỪ CHỐI file
 *  - warnings : bất thường nên kiểm tra lại, không chặn
 */
class ContractValidator extends BaseModel
{
    private array $data = [];
    private array $missing = [];
    private array $errors = [];
    private array $warnings = [];

    /**
     * @param array $raw    [key => chuỗi] từ ContractReader hoặc form
     * @param array $expect Ràng buộc từ hồ sơ ứng tuyển: email, national_id, branch_id
     */
    public function validate(array $raw, array $expect = []): array
    {
        $this->data = $this->missing = $this->errors = $this->warnings = [];
        $fields = ContractSchema::fields();

        foreach ($fields as $key => [$label, , $required, $type]) {
            $value = trim((string) ($raw[$key] ?? ''));
            if ($value === '') {
                $this->data[$key] = null;
                if ($required) {
                    $this->missing[] = ['field' => $key, 'label' => $label, 'message' => 'Chưa điền ' . mb_strtolower($label, 'UTF-8'), 'law' => ''];
                }
                continue;
            }
            $this->data[$key] = $this->normalize($key, $type, $value, $label);
        }

        $this->checkEmployee();
        $this->checkContract();
        $this->checkSalary();
        $this->checkCommitments();
        $this->checkDuplicates();
        $this->checkExpectations($expect);
        $this->fillDefaults();

        return [
            'data' => $this->data,
            'missing' => $this->missing,
            'errors' => $this->errors,
            'warnings' => $this->warnings,
            'ok' => $this->errors === [],
            'complete' => $this->errors === [] && $this->missing === [],
        ];
    }

    /* ------------------------------------------------------------------ chuẩn hoá */

    private function normalize(string $key, string $type, string $value, string $label)
    {
        switch ($type) {
            case 'date':
                $date = self::parseDate($value);
                if ($date === null) {
                    $this->error($key, "{$label} không đúng định dạng ngày (dd/mm/yyyy)");
                }
                return $date;
            case 'int':
                if (!preg_match('/^-?\d+$/', str_replace([' ', '.'], '', $value))) {
                    $this->error($key, "{$label} phải là số nguyên");
                    return null;
                }
                return (int) str_replace([' ', '.'], '', $value);
            case 'money':
                $digits = preg_replace('/\D+/', '', preg_replace('/[,.]00$/', '', $value));
                if ($digits === '') {
                    $this->error($key, "{$label} phải là số tiền");
                    return null;
                }
                return (float) $digits;
            case 'rate':
                $num = (float) str_replace(',', '.', preg_replace('/[^\d.,]/', '', $value));
                if ($num > 1) {
                    $num /= 100;
                }
                return round($num, 3);
            case 'yesno':
                $n = ContractSchema::normalizeLabel($value);
                if (in_array($n, ['co', 'yes', 'dong y', 'x', 'true', '1'], true)) {
                    return true;
                }
                if (in_array($n, ['khong', 'no', 'false', '0'], true)) {
                    return false;
                }
                $this->warn($key, "{$label}: không hiểu giá trị \"{$value}\" — ghi Có hoặc Không");
                return null;
            case 'email':
                $email = mb_strtolower($value, 'UTF-8');
                if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $this->error($key, 'Email không hợp lệ');
                }
                return $email;
            case 'phone':
                $phone = preg_replace('/[^\d+]/', '', $value);
                $phone = preg_replace('/^\+84/', '0', $phone);
                if (!preg_match('/^0\d{9}$/', $phone)) {
                    $this->error($key, 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0');
                }
                return $phone;
            case 'enum':
                return $this->normalizeEnum($key, $value, $label);
            default:
                return preg_replace('/\s+/u', ' ', $value);
        }
    }

    private function normalizeEnum(string $key, string $value, string $label)
    {
        $options = match ($key) {
            'gender' => array_combine(ContractSchema::GENDERS, ContractSchema::GENDERS),
            'contract_type' => ContractSchema::CONTRACT_TYPES,
            'qualification' => ContractSchema::QUALIFICATIONS,
            'payment_method' => array_combine(ContractSchema::PAYMENT_METHODS, ContractSchema::PAYMENT_METHODS),
            default => [],
        };
        $n = ContractSchema::normalizeLabel($value);
        foreach ($options as $code => $text) {
            $nt = ContractSchema::normalizeLabel($text);
            if ($n === ContractSchema::normalizeLabel($code) || $n === $nt || ($n !== '' && str_starts_with($nt, $n)) || ($nt !== '' && str_starts_with($n, $nt))) {
                return $code;
            }
        }
        // "Trung cấp" khớp MID_SKILL; "Đại học" coi như Cao đẳng trở lên
        if ($key === 'qualification') {
            if (preg_match('/dai hoc|cao dang|thac si|tien si|ky su|cu nhan/', $n)) {
                return 'HIGH_SKILL';
            }
            if (preg_match('/trung cap|cong nhan|so cap/', $n)) {
                return 'MID_SKILL';
            }
            if (preg_match('/quan ly|giam doc|truong phong/', $n)) {
                return 'MANAGER';
            }
        }
        if ($key === 'payment_method' && preg_match('/chuyen khoan|ngan hang|bank/', $n)) {
            return 'Chuyển khoản';
        }
        $this->error($key, "{$label} không hợp lệ — chọn một trong: " . implode(' / ', array_values($options)));
        return null;
    }

    public static function parseDate(string $value): ?string
    {
        $value = trim(preg_replace('/^ngay\s*/i', '', ContractSchema::stripDiacritics(mb_strtolower($value, 'UTF-8'))));
        if (preg_match('/^(\d{1,2})\s*(?:\/|-|\.|thang)\s*(\d{1,2})\s*(?:\/|-|\.|nam)\s*(\d{4})$/', $value, $m)) {
            [$d, $mo, $y] = [(int) $m[1], (int) $m[2], (int) $m[3]];
        } elseif (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/', $value, $m)) {
            [$y, $mo, $d] = [(int) $m[1], (int) $m[2], (int) $m[3]];
        } else {
            return null;
        }
        return checkdate($mo, $d, $y) ? sprintf('%04d-%02d-%02d', $y, $mo, $d) : null;
    }

    /* ------------------------------------------------------------------ quy tắc */

    private function checkEmployee(): void
    {
        $d = &$this->data;
        $today = date('Y-m-d');
        if ($d['date_of_birth']) {
            $ref = $d['start_date'] ?: $today;
            $age = (new DateTimeImmutable($d['date_of_birth']))->diff(new DateTimeImmutable($ref))->y;
            if ($age < 15) {
                $this->error('date_of_birth', "Người lao động mới {$age} tuổi khi bắt đầu làm việc — dưới 15 tuổi không được giao kết loại hợp đồng này", 'Điều 143, 145 BLLĐ 2019');
            } elseif ($age < 18) {
                $this->warn('date_of_birth', "Người lao động chưa thành niên ({$age} tuổi) — cần sự đồng ý của người đại diện theo pháp luật và hạn chế công việc", 'Điều 143–147 BLLĐ 2019');
            }
            if ($d['date_of_birth'] > $today) {
                $this->error('date_of_birth', 'Ngày sinh ở tương lai');
            }
        }
        if ($d['national_id'] !== null) {
            $d['national_id'] = preg_replace('/\s+/', '', $d['national_id']);
            if (!preg_match('/^\d{12}$/', $d['national_id'])) {
                $this->error('national_id', 'Số CCCD phải gồm đúng 12 chữ số', 'Luật Căn cước 2023');
            }
        }
        if ($d['national_id_issued_date']) {
            if ($d['national_id_issued_date'] > $today) {
                $this->error('national_id_issued_date', 'Ngày cấp CCCD ở tương lai');
            }
            if ($d['date_of_birth'] && $d['national_id_issued_date'] <= $d['date_of_birth']) {
                $this->error('national_id_issued_date', 'Ngày cấp CCCD phải sau ngày sinh');
            }
        }
        if ($d['tax_code'] !== null) {
            $d['tax_code'] = preg_replace('/[\s-]+/', '', $d['tax_code']);
            if (!preg_match('/^(\d{10}|\d{12}|\d{13})$/', $d['tax_code'])) {
                $this->error('tax_code', 'Mã số thuế cá nhân phải có 10, 12 hoặc 13 chữ số');
            }
        } else {
            $this->warn('tax_code', 'Chưa có mã số thuế — hệ thống sẽ dùng số CCCD làm mã số thuế khi quyết toán', 'Thông tư 86/2024/TT-BTC');
        }
        if ($d['dependents_count'] !== null && ($d['dependents_count'] < 0 || $d['dependents_count'] > 20)) {
            $this->error('dependents_count', 'Số người phụ thuộc không hợp lệ (0–20)');
        }
        if ($d['bank_account_number'] !== null) {
            $d['bank_account_number'] = preg_replace('/\s+/', '', $d['bank_account_number']);
            if (!preg_match('/^\d{6,20}$/', $d['bank_account_number'])) {
                $this->error('bank_account_number', 'Số tài khoản chỉ gồm 6–20 chữ số');
            }
        }
        if ($d['bank_account_name'] !== null) {
            $d['bank_account_name'] = mb_strtoupper(ContractSchema::stripDiacritics(mb_strtolower($d['bank_account_name'], 'UTF-8')), 'UTF-8');
        }
    }

    private function checkContract(): void
    {
        $d = &$this->data;
        $type = $d['contract_type'];
        if ($type === 'FIXED_TERM') {
            if (!$d['end_date']) {
                $this->error('end_date', 'Hợp đồng xác định thời hạn phải ghi ngày kết thúc', 'Điều 20 khoản 1 điểm b BLLĐ 2019');
            } elseif ($d['start_date']) {
                if ($d['end_date'] <= $d['start_date']) {
                    $this->error('end_date', 'Ngày kết thúc phải sau ngày bắt đầu');
                } else {
                    $limit = (new DateTimeImmutable($d['start_date']))->modify('+36 months')->format('Y-m-d');
                    if ($d['end_date'] > $limit) {
                        $this->error('end_date', 'Hợp đồng xác định thời hạn không được quá 36 tháng', 'Điều 20 khoản 1 điểm b BLLĐ 2019');
                    }
                }
            }
        } elseif ($type === 'INDEFINITE' && $d['end_date']) {
            $this->error('end_date', 'Hợp đồng không xác định thời hạn không được ghi ngày kết thúc', 'Điều 20 khoản 1 điểm a BLLĐ 2019');
        }

        $qual = $d['qualification'] ?? 'OTHER';
        $maxProbation = PayrollConfig::MAX_PROBATION_DAYS[$qual] ?? PayrollConfig::MAX_PROBATION_DAYS['OTHER'];
        if ($d['probation_days'] !== null) {
            if ($d['probation_days'] < 0) {
                $this->error('probation_days', 'Thời gian thử việc không được âm');
            } elseif ($d['probation_days'] > $maxProbation) {
                $label = ContractSchema::QUALIFICATIONS[$qual] ?? $qual;
                $this->error('probation_days', "Thử việc tối đa {$maxProbation} ngày với trình độ \"{$label}\"", 'Điều 25 BLLĐ 2019');
            }
            if ($d['probation_days'] > 0 && $type === 'FIXED_TERM' && $d['start_date'] && $d['end_date']) {
                $oneMonth = (new DateTimeImmutable($d['start_date']))->modify('+1 month')->format('Y-m-d');
                if ($d['end_date'] < $oneMonth) {
                    $this->error('probation_days', 'Không được thử việc với hợp đồng dưới 01 tháng', 'Điều 24 khoản 3 BLLĐ 2019');
                }
            }
        }
        $rate = $d['probation_salary_rate'];
        if ($rate !== null) {
            if ($rate < PayrollConfig::MIN_PROBATION_SALARY_RATE) {
                $this->error('probation_salary_rate', 'Lương thử việc tối thiểu bằng 85% mức lương của công việc', 'Điều 26 BLLĐ 2019');
            } elseif ($rate > 1) {
                $this->error('probation_salary_rate', 'Lương thử việc không vượt quá 100%');
            }
        }

        $hours = $d['working_hours_per_day'];
        $days = $d['working_days_per_week'];
        if ($hours !== null && ($hours <= 0 || $hours > PayrollConfig::MAX_HOURS_PER_DAY)) {
            $this->error('working_hours_per_day', 'Thời giờ làm việc bình thường không quá 8 giờ/ngày', 'Điều 105 BLLĐ 2019');
        }
        if ($days !== null && ($days <= 0 || $days > 6)) {
            $this->error('working_days_per_week', 'Người lao động được nghỉ ít nhất 01 ngày (24 giờ liên tục) mỗi tuần', 'Điều 111 BLLĐ 2019');
        }
        if ($hours && $days && $hours * $days > PayrollConfig::MAX_HOURS_PER_WEEK) {
            $this->error('working_days_per_week', 'Tổng thời giờ làm việc không quá 48 giờ/tuần (' . ($hours * $days) . ' giờ)', 'Điều 105 BLLĐ 2019');
        }
        if ($d['annual_leave_days'] !== null && $d['annual_leave_days'] < PayrollConfig::MIN_ANNUAL_LEAVE_DAYS) {
            $this->error('annual_leave_days', 'Nghỉ hằng năm tối thiểu 12 ngày làm việc', 'Điều 113 BLLĐ 2019');
        }
        if ($d['signed_date'] && $d['start_date'] && $d['signed_date'] > $d['start_date']) {
            $this->error('signed_date', 'Phải ký hợp đồng trước hoặc ngay ngày bắt đầu làm việc', 'Điều 13, 14 BLLĐ 2019');
        }
        if ($d['signed_date'] && $d['signed_date'] > date('Y-m-d')) {
            $this->warn('signed_date', 'Ngày ký ở tương lai');
        }

        // Chi nhánh → branch_id + vùng lương tối thiểu
        $d['branch_id'] = null;
        $d['region'] = 'I';
        if ($d['branch'] !== null) {
            $branch = $this->findBranch($d['branch']);
            if (!$branch) {
                $this->error('branch', 'Không có chi nhánh "' . $d['branch'] . '" trong hệ thống');
            } else {
                $d['branch_id'] = (int) $branch['id'];
                $d['branch_name'] = $branch['name'];
                $d['region'] = $branch['region'];
            }
        }
        if ($d['department'] !== null && !$this->departmentExists($d['department'])) {
            $this->warn('department', 'Phòng ban "' . $d['department'] . '" chưa có trong danh mục — sẽ được tạo mới khi duyệt');
        }
    }

    private function checkSalary(): void
    {
        $d = &$this->data;
        $minimum = PayrollConfig::REGIONAL_MINIMUM_WAGE[$d['region']] ?? PayrollConfig::REGIONAL_MINIMUM_WAGE['I'];
        $minText = number_format($minimum, 0, ',', '.') . 'đ';
        $base = $d['base_salary'];
        if ($base !== null) {
            if ($base < $minimum) {
                $this->error('base_salary', "Mức lương chính thấp hơn lương tối thiểu vùng {$d['region']} ({$minText})", 'Điều 90, 91 BLLĐ 2019; NĐ 293/2025/NĐ-CP');
            }
            $rate = $d['probation_salary_rate'] ?? 1;
            if (($d['probation_days'] ?? 0) > 0 && $base * $rate < $minimum) {
                $this->error('probation_salary_rate', 'Lương thử việc (' . number_format($base * $rate, 0, ',', '.') . "đ) thấp hơn lương tối thiểu vùng ({$minText})", 'Điều 26, 90 BLLĐ 2019');
            }
        }
        $ins = $d['insurance_salary'];
        if ($ins !== null) {
            if ($ins < $minimum) {
                $this->error('insurance_salary', "Lương đóng BHXH không được thấp hơn lương tối thiểu vùng ({$minText})", 'Điều 31 Luật BHXH 2024');
            }
            if ($base !== null && $ins < $base) {
                $this->error('insurance_salary', 'Lương đóng BHXH phải bao gồm ít nhất mức lương chính (không khai thấp để giảm đóng bảo hiểm)', 'Điều 31 Luật BHXH 2024');
            }
            if ($base !== null && $ins > $base + (float) ($d['allowance'] ?? 0)) {
                $this->warn('insurance_salary', 'Lương đóng BHXH cao hơn tổng lương + phụ cấp — kiểm tra lại');
            }
            if ($ins > PayrollConfig::socialInsuranceCap()) {
                $this->warn('insurance_salary', 'Vượt mức trần đóng BHXH/BHYT (' . number_format(PayrollConfig::socialInsuranceCap(), 0, ',', '.') . 'đ) — phần vượt không tính đóng');
            }
        }
        if ($d['allowance'] !== null && $d['allowance'] < 0) {
            $this->error('allowance', 'Phụ cấp không được âm');
        }
        if ($d['pay_day'] !== null && ($d['pay_day'] < 1 || $d['pay_day'] > 31)) {
            $this->error('pay_day', 'Ngày trả lương phải từ 1 đến 31', 'Điều 97 BLLĐ 2019');
        }
        if ($d['payment_method'] === 'Chuyển khoản' && !$d['bank_account_number']) {
            $this->warn('bank_account_number', 'Trả lương chuyển khoản nhưng chưa có số tài khoản');
        }
    }

    private function checkCommitments(): void
    {
        $d = $this->data;
        if ($d['employee_confirmation'] === false) {
            $this->error('employee_confirmation', 'Người lao động chưa xác nhận đồng ý điều khoản hợp đồng', 'Điều 15 BLLĐ 2019 — giao kết tự nguyện');
        }
        if ($d['employee_signature'] && $d['full_name']
            && ContractSchema::normalizeLabel($d['employee_signature']) !== ContractSchema::normalizeLabel($d['full_name'])) {
            $this->warn('employee_signature', 'Tên người ký khác họ tên người lao động — đối chiếu với bản scan');
        }
        if ($d['employer_representative'] && !str_contains(
            ContractSchema::normalizeLabel($d['employer_representative']),
            ContractSchema::normalizeLabel(ContractSchema::COMPANY['representative'])
        )) {
            $this->warn('employer_representative', 'Người đại diện khác người đại diện đã đăng ký (' . ContractSchema::COMPANY['representative'] . ') — cần giấy ủy quyền');
        }
        if (!empty($d['training_commitment']) && preg_match('/phat|boi thuong.*(gap|lan)/u', ContractSchema::stripDiacritics(mb_strtolower($d['training_commitment'], 'UTF-8')))) {
            $this->warn('training_commitment', 'Không được thỏa thuận phạt vi phạm/bồi thường quá chi phí đào tạo thực tế', 'Điều 39, 62 BLLĐ 2019');
        }
    }

    private function checkDuplicates(): void
    {
        $d = $this->data;
        $checks = [
            ['national_id', 'SELECT id FROM users WHERE national_id = ?', 'Số CCCD đã gắn với một nhân viên khác'],
            ['email', 'SELECT id FROM users WHERE email = ?', 'Email đã được dùng cho một tài khoản khác'],
            ['employee_code', 'SELECT id FROM users WHERE employee_code = ?', 'Mã nhân viên đã tồn tại'],
            ['contract_number', 'SELECT id FROM contracts WHERE contract_number = ?', 'Số hợp đồng đã tồn tại'],
        ];
        foreach ($checks as [$field, $sql, $message]) {
            if (!empty($d[$field])) {
                $stmt = $this->db->prepare($sql);
                $stmt->execute([$d[$field]]);
                if ($stmt->fetch()) {
                    $this->error($field, $message);
                }
            }
        }
    }

    private function checkExpectations(array $expect): void
    {
        $d = $this->data;
        if (!empty($expect['email']) && $d['email'] && mb_strtolower($expect['email']) !== $d['email']) {
            $this->error('email', 'Email trong hợp đồng khác email đã ứng tuyển (' . $expect['email'] . ')');
        }
        if (!empty($expect['national_id']) && $d['national_id'] && $expect['national_id'] !== $d['national_id']) {
            $this->error('national_id', 'Số CCCD trong hợp đồng khác số CCCD đã ứng tuyển');
        }
        if (!empty($expect['branch_id']) && $d['branch_id'] && (int) $expect['branch_id'] !== $d['branch_id']) {
            $this->warn('branch', 'Chi nhánh trong hợp đồng khác chi nhánh đã ứng tuyển');
        }
        if (!empty($expect['base_salary']) && $d['base_salary'] !== null && (float) $expect['base_salary'] !== $d['base_salary']) {
            $this->warn('base_salary', 'Mức lương khác mức lương trong thư mời (' . number_format((float) $expect['base_salary'], 0, ',', '.') . 'đ)');
        }
    }

    private function fillDefaults(): void
    {
        $d = &$this->data;
        $d['allowance'] ??= 0.0;
        $d['dependents_count'] ??= 0;
        $d['probation_days'] ??= 0;
        $d['probation_salary_rate'] = $d['probation_days'] > 0 ? ($d['probation_salary_rate'] ?? 1.0) : 1.0;
        $d['qualification'] ??= 'OTHER';
        $d['status'] = $d['probation_days'] > 0 ? 'Thử việc' : 'Đang làm việc';
        $d['joined_at'] = $d['start_date'];
        $parts = [];
        if ($d['job_description']) {
            $parts[] = 'Mô tả công việc: ' . $d['job_description'];
        }
        $parts[] = 'Bảo mật thông tin: ' . ($d['confidentiality'] === true ? 'Có' : ($d['confidentiality'] === false ? 'Không' : 'Chưa ghi'));
        if ($d['training_commitment']) {
            $parts[] = 'Đào tạo/bồi hoàn: ' . $d['training_commitment'];
        }
        if ($d['other_commitments']) {
            $parts[] = 'Khác: ' . $d['other_commitments'];
        }
        $parts[] = 'Trình độ: ' . (ContractSchema::QUALIFICATIONS[$d['qualification']] ?? $d['qualification']);
        $d['commitments'] = implode("\n", $parts);
    }

    /* ------------------------------------------------------------------ tra cứu */

    private function findBranch(string $value): ?array
    {
        $stmt = $this->db->query('SELECT id, code, name, region FROM branches WHERE is_active = 1');
        $n = ContractSchema::normalizeLabel($value);
        foreach ($stmt->fetchAll() as $b) {
            if ($n === ContractSchema::normalizeLabel($b['code']) || $n === ContractSchema::normalizeLabel($b['name'])
                || str_contains($n, ContractSchema::normalizeLabel($b['name']))) {
                return $b;
            }
        }
        return null;
    }

    private function departmentExists(string $name): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM departments WHERE name = ?');
        $stmt->execute([$name]);
        return (bool) $stmt->fetch();
    }

    private function error(string $field, string $message, string $law = ''): void
    {
        $this->errors[] = $this->issue($field, $message, $law);
    }

    private function warn(string $field, string $message, string $law = ''): void
    {
        $this->warnings[] = $this->issue($field, $message, $law);
    }

    private function issue(string $field, string $message, string $law): array
    {
        return ['field' => $field, 'label' => ContractSchema::fields()[$field][0] ?? $field, 'message' => $message, 'law' => $law];
    }
}
