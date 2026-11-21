<?php
class PayrollEngine {

    /** Giảm trừ gia cảnh từ kỳ tính thuế 2026 (Nghị quyết 110/2025/UBTVQH15). */
    const PERSONAL_DEDUCTION  = 15500000;
    const DEPENDENT_DEDUCTION = 6200000;
    /** BHXH 8% + BHYT 1,5% + BHTN 1% phần người lao động đóng. */
    const INSURANCE_RATE = 0.105;

    /**
     * Biểu thuế lũy tiến từng phần 5 bậc (Luật Thuế TNCN 109/2025/QH15, áp dụng từ 01/01/2026).
     * Mỗi bậc: [trần thu nhập tính thuế/tháng, thuế suất].
     */
    const TAX_BRACKETS = [
        [10000000, 0.05],
        [30000000, 0.10],
        [60000000, 0.20],
        [100000000, 0.30],
        [INF, 0.35],
    ];

    /**
     * Tính toán toàn diện lương Gross -> Net theo luật VN và chính sách phúc lợi công ty
     * @param float $baseSalary Lương cơ bản thỏa thuận trong hợp đồng
     * @param float $allowance Phụ cấp cố định (Ăn trưa, xăng xe...)
     * @param float $actualDays Số ngày công thực tế làm việc
     * @param float $standardDays Số ngày công chuẩn của công ty trong tháng
     * @param float $otHours Số giờ làm thêm
     * @param float $otRate Hệ số lương OT (Mặc định 1.5 theo luật)
     * @param int $dependents Số người phụ thuộc giảm trừ gia cảnh
     * @param float|null $insuranceSalary Mức lương làm căn cứ đóng bảo hiểm
     * @return array Kết quả chi tiết các cấu phần lương trả về JSON cho React
     */
    public static function calculateNetSalary($baseSalary, $allowance, $actualDays, $standardDays, $otHours = 0, $otRate = 1.5, $dependents = 0, $insuranceSalary = null) {

        // 1. Lương theo ngày công thực tế: (Lương cơ bản / Công chuẩn) × Công thực tế
        $proRatedBaseSalary = ($standardDays > 0) ? ($baseSalary / $standardDays) * $actualDays : 0;

        // 2. Tiền làm thêm giờ
        $standardHours = $standardDays * 8;
        $hourlyRate = $standardHours > 0 ? $baseSalary / $standardHours : 0;
        $otPay = $otHours * $hourlyRate * $otRate;
        // Phần trả cao hơn giờ làm bình thường được miễn thuế TNCN (Thông tư 111/2013/TT-BTC, Điều 3 khoản 1 điểm i)
        $otTaxExempt = $otHours * $hourlyRate * max(0, $otRate - 1);

        // 3. Tổng thu nhập Gross
        $grossSalary = $proRatedBaseSalary + $allowance + $otPay;

        // 4. Bảo hiểm bắt buộc trên mức lương đóng bảo hiểm ghi trong hợp đồng
        $insuranceSalary = $insuranceSalary === null ? $baseSalary : $insuranceSalary;
        $socialInsurance = $insuranceSalary * self::INSURANCE_RATE;

        // 5. Thuế TNCN
        // Thu nhập tính thuế = (Gross − phần OT miễn thuế) − Bảo hiểm − Giảm trừ gia cảnh
        $taxDeduction = self::PERSONAL_DEDUCTION + max(0, (int) $dependents) * self::DEPENDENT_DEDUCTION;
        $totalDeduction = $socialInsurance + $taxDeduction;
        $taxableIncome = max(0, $grossSalary - $otTaxExempt - $totalDeduction);
        $personalTax = self::calculateProgressiveTax($taxableIncome);

        // 6. Lương Net thực nhận
        $netSalary = $grossSalary - $socialInsurance - $personalTax;

        return [
            "base_salary"       => round($baseSalary, 2),
            "actual_days"       => $actualDays,
            "standard_days"     => $standardDays,
            "ot_hours"          => $otHours,
            "pro_rated_salary"  => round($proRatedBaseSalary, 2),
            "allowance"         => round($allowance, 2),
            "ot_pay"            => round($otPay, 2),
            "ot_tax_exempt"     => round($otTaxExempt, 2),
            "gross_salary"      => round($grossSalary, 2),
            "social_insurance"  => round($socialInsurance, 2),
            "tax_deduction"     => round($taxDeduction, 2),
            "total_deduction"   => round($totalDeduction, 2),
            "taxable_income"    => round($taxableIncome, 2),
            "personal_tax"      => round($personalTax, 2),
            "net_salary"        => round($netSalary, 2)
        ];
    }

    /** Thuế TNCN lũy tiến từng phần theo biểu 5 bậc. */
    public static function calculateProgressiveTax($income) {
        $tax = 0;
        $floor = 0;
        foreach (self::TAX_BRACKETS as [$ceiling, $rate]) {
            if ($income <= $floor) break;
            $tax += (min($income, $ceiling) - $floor) * $rate;
            $floor = $ceiling;
        }
        return $tax;
    }

    /**
     * Suy ngược thu nhập tính thuế từ số thuế đã lưu (biểu lũy tiến đơn điệu tăng nên kết quả duy nhất).
     * Thuế 0 → trả 0 (thu nhập sau bảo hiểm không vượt mức giảm trừ).
     */
    public static function taxableIncomeFromTax($tax) {
        $tax = (float) $tax;
        if ($tax <= 0) return 0.0;
        $floor = 0; $base = 0;
        foreach (self::TAX_BRACKETS as [$ceiling, $rate]) {
            $bracketTax = ($ceiling - $floor) * $rate;
            if ($tax <= $base + $bracketTax) return round($floor + ($tax - $base) / $rate, 2);
            $base += $bracketTax;
            $floor = $ceiling;
        }
        return round($floor, 2);
    }

    /** Diễn giải thuế cho phiếu lương từ một dòng payroll_items đã lưu. */
    public static function taxBreakdown(array $item) {
        $taxDeduction = (float) ($item['tax_deduction'] ?? 0);
        $dependents = max(0, (int) round(($taxDeduction - self::PERSONAL_DEDUCTION) / self::DEPENDENT_DEDUCTION));
        return [
            'personal_deduction' => (float) self::PERSONAL_DEDUCTION,
            'dependents_count'   => $dependents,
            'dependent_deduction'=> (float) ($dependents * self::DEPENDENT_DEDUCTION),
            'taxable_income'     => self::taxableIncomeFromTax($item['personal_tax'] ?? 0),
        ];
    }
}
?>
