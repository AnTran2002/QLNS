<?php
class PayrollEngine {
    
    /**
     * Tính toán toàn diện lương Gross -> Net theo luật VN và chính sách phúc lợi công ty
     * @param float $baseSalary Lương cơ bản thỏa thuận trong hợp đồng
     * @param float $allowance Phụ cấp cố định (Ăn trưa, xăng xe...)
     * @param float $actualDays Số ngày công thực tế làm việc
     * @param float $standardDays Số ngày công chuẩn của công ty trong tháng (VD: 22 hoặc 26 ngày)
     * @param float $otHours Số giờ làm thêm
     * @param float $otRate Hệ số lương OT (Mặc định 1.5 theo luật, công ty có thể set-up 2.0)
     * @param int $dependents Số người phụ thuộc giảm trừ gia cảnh
     * @param float|null $insuranceSalary Mức lương làm căn cứ đóng bảo hiểm
     * @return array Kết quả chi tiết các cấu phần lương trả về JSON cho React
     */
    public static function calculateNetSalary($baseSalary, $allowance, $actualDays, $standardDays, $otHours = 0, $otRate = 1.5, $dependents = 0, $insuranceSalary = null) {
        
        // 1. Tính lương theo ngày công thực tế (Pro-rata calculation)
        // Công thức: (Lương cơ bản / Ngày công chuẩn) * Ngày công thực tế
        $proRatedBaseSalary = ($standardDays > 0) ? ($baseSalary / $standardDays) * $actualDays : 0;
        
        // 2. Tính tiền làm thêm giờ (OT Overtime)
        $standardHours = $standardDays * 8;
        $hourlyRate = $standardHours > 0 ? $baseSalary / $standardHours : 0;
        $otPay = $otHours * $hourlyRate * $otRate;
        
        // 3. Tổng thu nhập Gross thực tế
        $grossSalary = $proRatedBaseSalary + $allowance + $otPay;
        
        // 4. Trích đóng bảo hiểm trên mức lương làm căn cứ đóng bảo hiểm trong hợp đồng
        // Lưu ý: Có mức trần đóng BHXH theo quy định nhà nước (20 lần mức lương cơ sở), ở đây ta tính trực tiếp trên mức đóng bảo hiểm.
        $insuranceSalary = $insuranceSalary === null ? $baseSalary : $insuranceSalary;
        $socialInsurance = $insuranceSalary * 0.105;
        
        // 5. Tính Thuế Thu nhập cá nhân (TNCN)
        // Thu nhập chịu thuế = Gross - Bảo hiểm - Giảm trừ bản thân (11tr) - (Số người phụ thuộc * 4.4tr)
        $personalDeduction = 11000000; // 11 triệu đồng cho bản thân
        $dependentDeduction = $dependents * 4400000; // 4.4 triệu đồng / người phụ thuộc
        $taxDeduction = $personalDeduction + $dependentDeduction;
        $totalDeduction = $socialInsurance + $taxDeduction;
        
        $taxableIncome = $grossSalary - $totalDeduction;
        $personalTax = 0;
        
        if ($taxableIncome > 0) {
            $personalTax = self::calculateProgressiveTax($taxableIncome);
        } else {
            $taxableIncome = 0;
        }
        
        // 6. Lương Net thực nhận cuối cùng
        $netSalary = $grossSalary - $socialInsurance - $personalTax;

        return [
            "base_salary"       => round($baseSalary, 2),
            "actual_days"       => $actualDays,
            "standard_days"     => $standardDays,
            "ot_hours"          => $otHours,
            "pro_rated_salary"  => round($proRatedBaseSalary, 2),
            "allowance"         => round($allowance, 2),
            "ot_pay"            => round($otPay, 2),
            "gross_salary"      => round($grossSalary, 2),
            "social_insurance"  => round($socialInsurance, 2),
            "tax_deduction"     => round($taxDeduction, 2),
            "total_deduction"   => round($totalDeduction, 2),
            "taxable_income"    => round($taxableIncome, 2),
            "personal_tax"      => round($personalTax, 2),
            "net_salary"        => round($netSalary, 2)
        ];
    }

    /**
     * Thuế TNCN lũy tiến từng phần (Biểu thuế 7 bậc theo luật Việt Nam)
     */
    private static function calculateProgressiveTax($income) {
        $tax = 0;
        if ($income <= 5000000) {
            $tax = $income * 0.05;
        } elseif ($income <= 10000000) {
            $tax = 250000 + ($income - 5000000) * 0.10;
        } elseif ($income <= 18000000) {
            $tax = 750000 + ($income - 10000000) * 0.15;
        } elseif ($income <= 32000000) {
            $tax = 1950000 + ($income - 18000000) * 0.20;
        } elseif ($income <= 52000000) {
            $tax = 4750000 + ($income - 32000000) * 0.25;
        } elseif ($income <= 80000000) {
            $tax = 9750000 + ($income - 52000000) * 0.30;
        } else {
            $tax = 18150000 + ($income - 80000000) * 0.35;
        }
        return $tax;
    }
}
?>