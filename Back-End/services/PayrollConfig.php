<?php

/**
 * Tham số pháp lý dùng chung cho tính lương, kiểm tra hợp đồng và trang hiển thị.
 * Front-End KHÔNG tự khai báo các con số này — chúng được trả qua API `meta`.
 *
 * Căn cứ:
 *  - Bộ luật Lao động 2019 (Điều 98 làm thêm giờ, Điều 105 thời giờ làm việc, Điều 112 ngày lễ, Điều 113 nghỉ hằng năm).
 *  - Luật BHXH 2024, Luật BHYT, Luật Việc làm: NLĐ 8% BHXH, 1,5% BHYT, 1% BHTN; NSDLĐ 17,5% / 3% / 1%.
 *  - Nghị định 73/2024/NĐ-CP: lương cơ sở 2.340.000đ → trần BHXH/BHYT = 20 lần.
 *  - Nghị định 293/2025/NĐ-CP: lương tối thiểu vùng từ 01/01/2026 → trần BHTN = 20 lần lương tối thiểu vùng.
 *  - Luật Thuế TNCN sửa đổi (áp dụng kỳ tính thuế 2026): giảm trừ 15,5tr/6,2tr, biểu lũy tiến 5 bậc.
 */
final class PayrollConfig
{
    public const REFERENCE_SALARY = 2_340_000;          // Lương cơ sở
    public const INSURANCE_CAP_MULTIPLIER = 20;

    public const REGIONAL_MINIMUM_WAGE = [
        'I'   => 5_310_000,
        'II'  => 4_730_000,
        'III' => 4_140_000,
        'IV'  => 3_700_000,
    ];

    public const EMPLOYEE_RATES = [
        'bhxh' => 0.08,
        'bhyt' => 0.015,
        'bhtn' => 0.01,
    ];

    public const EMPLOYER_RATES = [
        'bhxh' => 0.175,   // 14% hưu trí-tử tuất + 3% ốm đau-thai sản + 0,5% TNLĐ-BNN
        'bhyt' => 0.03,
        'bhtn' => 0.01,
    ];

    public const OT_MULTIPLIERS = [
        'weekday' => 1.5,
        'weekend' => 2.0,
        'holiday' => 3.0,
    ];

    public const STANDARD_HOURS_PER_DAY = 8;
    public const MAX_HOURS_PER_DAY = 8;
    public const MAX_HOURS_PER_WEEK = 48;
    public const MAX_OT_HOURS_PER_MONTH = 40;
    public const MAX_OT_HOURS_PER_YEAR = 300;
    public const MIN_ANNUAL_LEAVE_DAYS = 12;
    public const MIN_PROBATION_SALARY_RATE = 0.85;

    /** Số ngày thử việc tối đa theo Điều 25 BLLĐ 2019. */
    public const MAX_PROBATION_DAYS = [
        'MANAGER'     => 180, // Người quản lý doanh nghiệp
        'HIGH_SKILL'  => 60,  // Trình độ cao đẳng trở lên
        'MID_SKILL'   => 30,  // Trung cấp, công nhân kỹ thuật, nhân viên nghiệp vụ
        'OTHER'       => 6,   // Công việc khác (ngày làm việc)
    ];

    public static function taxRules(int $taxYear): array
    {
        if ($taxYear >= 2026) {
            return [
                'personal_deduction' => 15_500_000,
                'dependent_deduction' => 6_200_000,
                'brackets' => [
                    [0, 10_000_000, 0.05],
                    [10_000_000, 30_000_000, 0.10],
                    [30_000_000, 60_000_000, 0.20],
                    [60_000_000, 100_000_000, 0.30],
                    [100_000_000, null, 0.35],
                ],
            ];
        }

        return [
            'personal_deduction' => 11_000_000,
            'dependent_deduction' => 4_400_000,
            'brackets' => [
                [0, 5_000_000, 0.05],
                [5_000_000, 10_000_000, 0.10],
                [10_000_000, 18_000_000, 0.15],
                [18_000_000, 32_000_000, 0.20],
                [32_000_000, 52_000_000, 0.25],
                [52_000_000, 80_000_000, 0.30],
                [80_000_000, null, 0.35],
            ],
        ];
    }

    public static function socialInsuranceCap(): float
    {
        return self::REFERENCE_SALARY * self::INSURANCE_CAP_MULTIPLIER;
    }

    public static function unemploymentInsuranceCap(string $region = 'I'): float
    {
        $wage = self::REGIONAL_MINIMUM_WAGE[$region] ?? self::REGIONAL_MINIMUM_WAGE['I'];
        return $wage * self::INSURANCE_CAP_MULTIPLIER;
    }

    /** Toàn bộ tham số cho Front-End hiển thị (không chứa dữ liệu nhạy cảm). */
    public static function toArray(?int $taxYear = null): array
    {
        $taxYear = $taxYear ?? (int) date('Y');
        $tax = self::taxRules($taxYear);
        return [
            'tax_year' => $taxYear,
            'reference_salary' => self::REFERENCE_SALARY,
            'regional_minimum_wage' => self::REGIONAL_MINIMUM_WAGE,
            'social_insurance_cap' => self::socialInsuranceCap(),
            'unemployment_insurance_cap' => self::unemploymentInsuranceCap('I'),
            'employee_rates' => self::EMPLOYEE_RATES,
            'employer_rates' => self::EMPLOYER_RATES,
            'insurance_rate' => array_sum(self::EMPLOYEE_RATES),
            'employer_insurance_rate' => array_sum(self::EMPLOYER_RATES),
            'ot_multipliers' => self::OT_MULTIPLIERS,
            'standard_hours_per_day' => self::STANDARD_HOURS_PER_DAY,
            'max_hours_per_week' => self::MAX_HOURS_PER_WEEK,
            'max_ot_hours_per_month' => self::MAX_OT_HOURS_PER_MONTH,
            'max_ot_hours_per_year' => self::MAX_OT_HOURS_PER_YEAR,
            'min_annual_leave_days' => self::MIN_ANNUAL_LEAVE_DAYS,
            'min_probation_salary_rate' => self::MIN_PROBATION_SALARY_RATE,
            'max_probation_days' => self::MAX_PROBATION_DAYS,
            'personal_deduction' => $tax['personal_deduction'],
            'dependent_deduction' => $tax['dependent_deduction'],
            'tax_brackets' => array_map(
                fn ($b) => ['from' => $b[0], 'to' => $b[1], 'rate' => $b[2]],
                $tax['brackets']
            ),
        ];
    }
}
