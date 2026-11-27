<?php

/**
 * Danh sách trường của mẫu hợp đồng lao động PeopleOS.
 * Dùng chung cho: sinh file mẫu .docx, đọc file đã điền, kiểm tra pháp lý, hiển thị trên web.
 * Nội dung bắt buộc theo Điều 21 Bộ luật Lao động 2019.
 */
final class ContractSchema
{
    public const COMPANY = [
        'name' => 'Công ty Cổ phần PeopleOS',
        'tax_code' => '0109999999',
        'address' => 'Tầng 12, 54 Liễu Giai, Ba Đình, Hà Nội',
        'phone' => '024 3999 9999',
        'representative' => 'Trần Minh Quân',
        'representative_title' => 'Giám đốc Nhân sự',
    ];

    public const QUALIFICATIONS = [
        'MANAGER' => 'Quản lý doanh nghiệp',
        'HIGH_SKILL' => 'Cao đẳng trở lên',
        'MID_SKILL' => 'Trung cấp / công nhân kỹ thuật',
        'OTHER' => 'Công việc khác',
    ];

    public const CONTRACT_TYPES = [
        'INDEFINITE' => 'Không xác định thời hạn',
        'FIXED_TERM' => 'Xác định thời hạn',
    ];

    public const PAYMENT_METHODS = ['Chuyển khoản', 'Tiền mặt'];
    public const GENDERS = ['Nam', 'Nữ', 'Khác'];

    /**
     * key => [label, section, required, type, hint]
     * type: text | date | int | money | rate | enum | yesno | email | phone
     */
    public static function fields(): array
    {
        return [
            // Bên B
            'full_name' => ['Họ và tên', 'employee', true, 'text', 'VD: Nguyễn Văn An'],
            'date_of_birth' => ['Ngày sinh', 'employee', true, 'date', 'dd/mm/yyyy'],
            'gender' => ['Giới tính', 'employee', true, 'enum', 'Nam / Nữ / Khác'],
            'national_id' => ['Số CCCD', 'employee', true, 'text', '12 chữ số'],
            'national_id_issued_date' => ['Ngày cấp CCCD', 'employee', true, 'date', 'dd/mm/yyyy'],
            'national_id_issued_place' => ['Nơi cấp CCCD', 'employee', true, 'text', 'VD: Cục Cảnh sát QLHC về TTXH'],
            'address' => ['Địa chỉ thường trú', 'employee', true, 'text', 'Số nhà, đường, phường/xã, tỉnh/thành'],
            'phone' => ['Số điện thoại', 'employee', true, 'phone', '10 số, bắt đầu bằng 0'],
            'email' => ['Email', 'employee', true, 'email', 'Dùng để đăng nhập và nhận phiếu lương'],
            'tax_code' => ['Mã số thuế cá nhân', 'employee', false, 'text', 'Từ 01/07/2025 có thể dùng số CCCD'],
            'dependents_count' => ['Số người phụ thuộc', 'employee', false, 'int', 'Đăng ký giảm trừ gia cảnh, mặc định 0'],
            'bank_name' => ['Ngân hàng nhận lương', 'employee', false, 'text', 'VD: Vietcombank'],
            'bank_account_number' => ['Số tài khoản', 'employee', false, 'text', ''],
            'bank_account_name' => ['Chủ tài khoản', 'employee', false, 'text', 'Viết in hoa không dấu'],

            // Nội dung hợp đồng
            'contract_number' => ['Số hợp đồng', 'contract', true, 'text', 'VD: 015/2026/HĐLĐ-PEOPLEOS'],
            'employee_code' => ['Mã nhân viên', 'contract', false, 'text', 'Để trống để hệ thống tự cấp'],
            'contract_type' => ['Loại hợp đồng', 'contract', true, 'enum', 'Không xác định thời hạn / Xác định thời hạn'],
            'start_date' => ['Ngày bắt đầu làm việc', 'contract', true, 'date', 'dd/mm/yyyy'],
            'end_date' => ['Ngày kết thúc hợp đồng', 'contract', false, 'date', 'Bắt buộc với HĐ xác định thời hạn (tối đa 36 tháng)'],
            'branch' => ['Chi nhánh làm việc', 'contract', true, 'text', 'Mã chi nhánh, VD: HN / HCM / DN'],
            'department' => ['Phòng ban', 'contract', true, 'text', ''],
            'position' => ['Chức danh', 'contract', true, 'text', 'Vị trí công việc'],
            'job_description' => ['Mô tả công việc', 'contract', false, 'text', 'Các nhiệm vụ chính'],
            'qualification' => ['Trình độ', 'contract', true, 'enum', 'Quản lý doanh nghiệp / Cao đẳng trở lên / Trung cấp / Công việc khác'],
            'probation_days' => ['Thời gian thử việc (ngày)', 'contract', true, 'int', '0 nếu không thử việc'],
            'probation_salary_rate' => ['Lương thử việc (% lương chính)', 'contract', false, 'rate', 'Tối thiểu 85%'],
            'working_hours_per_day' => ['Số giờ làm việc mỗi ngày', 'contract', true, 'int', 'Tối đa 8 giờ'],
            'working_days_per_week' => ['Số ngày làm việc mỗi tuần', 'contract', true, 'int', 'Tối đa 6 ngày, tổng ≤ 48 giờ/tuần'],
            'annual_leave_days' => ['Số ngày nghỉ phép năm', 'contract', true, 'int', 'Tối thiểu 12 ngày'],

            // Tiền lương
            'base_salary' => ['Mức lương chính (VNĐ/tháng)', 'salary', true, 'money', 'Không thấp hơn lương tối thiểu vùng'],
            'allowance' => ['Phụ cấp lương cố định (VNĐ/tháng)', 'salary', true, 'money', 'Theo mức cố định ghi trong hợp đồng; nhập 0 nếu không có'],
            'insurance_salary' => ['Lương đóng BHXH (VNĐ/tháng)', 'salary', true, 'money', 'Không thấp hơn mức lương chính'],
            'payment_method' => ['Hình thức trả lương', 'salary', true, 'enum', 'Chuyển khoản / Tiền mặt'],
            'pay_day' => ['Ngày trả lương hằng tháng', 'salary', true, 'int', '1–31'],

            // Cam kết
            'confidentiality' => ['Cam kết bảo mật thông tin', 'commitment', true, 'yesno', 'Có / Không'],
            'training_commitment' => ['Cam kết đào tạo, bồi hoàn', 'commitment', false, 'text', 'Nếu có'],
            'other_commitments' => ['Cam kết khác', 'commitment', false, 'text', ''],
            'employee_confirmation' => ['Người lao động xác nhận đã đọc và đồng ý toàn bộ điều khoản', 'commitment', true, 'yesno', 'Ghi "Có"'],

            // Ký kết
            'signed_date' => ['Ngày ký hợp đồng', 'signing', true, 'date', 'dd/mm/yyyy — trước hoặc bằng ngày bắt đầu'],
            'employee_signature' => ['Người lao động ký tên', 'signing', true, 'text', 'Ghi rõ họ tên'],
            'employer_representative' => ['Đại diện người sử dụng lao động', 'signing', true, 'text', ''],
        ];
    }

    public static function sections(): array
    {
        return [
            'employee' => 'I. THÔNG TIN NGƯỜI LAO ĐỘNG (BÊN B)',
            'contract' => 'II. CÔNG VIỆC, THỜI HẠN VÀ THỜI GIỜ LÀM VIỆC',
            'salary' => 'III. TIỀN LƯƠNG VÀ HÌNH THỨC TRẢ LƯƠNG',
            'commitment' => 'IV. CAM KẾT',
            'signing' => 'V. KÝ KẾT',
        ];
    }

    /** Chuẩn hoá nhãn để so khớp: bỏ dấu, chữ thường, bỏ phần trong ngoặc và ký tự đặc biệt. */
    public static function normalizeLabel(string $label): string
    {
        $label = preg_replace('/\(.*?\)/u', '', $label);
        $label = self::stripDiacritics(mb_strtolower(trim($label), 'UTF-8'));
        $label = preg_replace('/[^a-z0-9 ]+/', ' ', $label);
        return trim(preg_replace('/\s+/', ' ', $label));
    }

    public static function stripDiacritics(string $s): string
    {
        $map = [
            'a' => 'àáạảãâầấậẩẫăằắặẳẵ', 'e' => 'èéẹẻẽêềếệểễ', 'i' => 'ìíịỉĩ',
            'o' => 'òóọỏõôồốộổỗơờớợởỡ', 'u' => 'ùúụủũưừứựửữ', 'y' => 'ỳýỵỷỹ', 'd' => 'đ',
        ];
        foreach ($map as $plain => $chars) {
            $s = preg_replace('/[' . $chars . ']/u', $plain, $s);
        }
        return $s;
    }

    /** Bảng nhãn đã chuẩn hoá → key. */
    public static function labelIndex(): array
    {
        $index = [];
        foreach (self::fields() as $key => [$label]) {
            $index[self::normalizeLabel($label)] = $key;
        }
        return $index;
    }

    /** Danh sách trường cho Front-End. */
    public static function toArray(): array
    {
        $out = [];
        foreach (self::fields() as $key => [$label, $section, $required, $type, $hint]) {
            $out[] = compact('key', 'label', 'section', 'required', 'type', 'hint');
        }
        return [
            'company' => self::COMPANY,
            'sections' => self::sections(),
            'fields' => $out,
            'qualifications' => self::QUALIFICATIONS,
            'contract_types' => self::CONTRACT_TYPES,
            'payment_methods' => self::PAYMENT_METHODS,
            'genders' => self::GENDERS,
        ];
    }
}
