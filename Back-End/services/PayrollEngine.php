<?php

require_once __DIR__ . '/PayrollConfig.php';

/**
 * Bộ máy tính lương Gross → Net theo luật Việt Nam.
 *
 * Trình tự (mỗi bước đều được ghi lại trong `breakdown` để nhân viên đối chiếu):
 *  1. Lương theo ngày công  = Lương HĐ × hệ số (thử việc) ÷ công chuẩn × (ngày đi làm + ngày phép/lễ hưởng lương)
 *  2. Phụ cấp cố định theo hợp đồng
 *  3. Làm thêm giờ          = Lương giờ × (giờ ngày thường × 150% + giờ nghỉ tuần × 200% + giờ lễ × 300%)
 *  4. Bảo hiểm bắt buộc     = BHXH 8% + BHYT 1,5% (trần 20 × lương cơ sở) + BHTN 1% (trần 20 × lương tối thiểu vùng)
 *  5. Thuế TNCN             = biểu lũy tiến trên (Gross − BH − giảm trừ gia cảnh − phần OT miễn thuế)
 *  6. Thực nhận             = Gross − BH − Thuế
 */
class PayrollEngine
{
    /**
     * Giữ chữ ký cũ cho các nơi gọi hiện có — mọi giờ OT được tính theo `$otRate`.
     */
    public static function calculateNetSalary($baseSalary, $allowance, $actualDays, $standardDays, $otHours = 0, $otRate = 1.5, $dependents = 0, $insuranceSalary = null, ?int $taxYear = null)
    {
        return self::calculateDetailed([
            'base_salary' => $baseSalary,
            'allowance' => $allowance,
            'actual_days' => $actualDays,
            'standard_days' => $standardDays,
            'ot_hours' => $otHours,
            'ot_rate' => $otRate,
            'dependents' => $dependents,
            'insurance_salary' => $insuranceSalary,
            'tax_year' => $taxYear,
        ]);
    }

    /**
     * @param array $in base_salary, allowance, actual_days, standard_days, ot_hours,
     *                  [ot_weekend_hours, ot_holiday_hours, ot_rate, dependents, insurance_salary,
     *                   tax_year, region, salary_rate, paid_leave_days, holiday_days,
     *                   late_count, unpaid_leave_days, absent_days, sick_leave_days, remote_days]
     */
    public static function calculateDetailed(array $in): array
    {
        $baseSalary = (float) ($in['base_salary'] ?? 0);
        $allowance = (float) ($in['allowance'] ?? 0);
        $actualDays = (float) ($in['actual_days'] ?? 0);
        $standardDays = (float) ($in['standard_days'] ?? 0);
        $otHours = max(0.0, (float) ($in['ot_hours'] ?? 0));
        $otWeekend = max(0.0, (float) ($in['ot_weekend_hours'] ?? 0));
        $otHoliday = max(0.0, (float) ($in['ot_holiday_hours'] ?? 0));
        $otWeekend = min($otWeekend, $otHours);
        $otHoliday = min($otHoliday, $otHours - $otWeekend);
        $otWeekday = $otHours - $otWeekend - $otHoliday;
        $otRateWeekday = (float) ($in['ot_rate'] ?? PayrollConfig::OT_MULTIPLIERS['weekday']);
        $dependents = max(0, (int) ($in['dependents'] ?? 0));
        $insuranceSalary = ($in['insurance_salary'] ?? null) === null ? $baseSalary : (float) $in['insurance_salary'];
        $taxYear = (int) ($in['tax_year'] ?? date('Y'));
        $region = (string) ($in['region'] ?? 'I');
        $salaryRate = (float) ($in['salary_rate'] ?? 1.0);
        if ($salaryRate <= 0 || $salaryRate > 1) {
            $salaryRate = 1.0;
        }
        $paidLeaveDays = max(0.0, (float) ($in['paid_leave_days'] ?? 0));
        $holidayDays = max(0.0, (float) ($in['holiday_days'] ?? 0));

        // ---- 1. Lương theo ngày công ----
        $effectiveBase = $baseSalary * $salaryRate;
        $dailyRate = $standardDays > 0 ? $effectiveBase / $standardDays : 0.0;
        $missingDays = max(0.0, $standardDays - $actualDays);
        $paidHolidayDays = min($holidayDays, $missingDays);
        $paidLeaveCounted = min($paidLeaveDays, max(0.0, $missingDays - $paidHolidayDays));
        $paidDays = $actualDays + $paidHolidayDays + $paidLeaveCounted;

        $workedPay = $dailyRate * $actualDays;
        $holidayPay = $dailyRate * $paidHolidayDays;
        $leavePay = $dailyRate * $paidLeaveCounted;
        $proRatedBaseSalary = $workedPay + $holidayPay + $leavePay;

        // ---- 3. Làm thêm giờ ----
        $standardHours = $standardDays * PayrollConfig::STANDARD_HOURS_PER_DAY;
        $hourlyRate = $standardHours > 0 ? $effectiveBase / $standardHours : 0.0;
        $otMultipliers = [
            'weekday' => $otRateWeekday,
            'weekend' => PayrollConfig::OT_MULTIPLIERS['weekend'],
            'holiday' => PayrollConfig::OT_MULTIPLIERS['holiday'],
        ];
        $otHoursByType = ['weekday' => $otWeekday, 'weekend' => $otWeekend, 'holiday' => $otHoliday];
        $otPay = 0.0;
        $taxExemptOvertime = 0.0;
        $otLines = [];
        $otLabels = [
            'weekday' => 'Làm thêm ngày thường',
            'weekend' => 'Làm thêm ngày nghỉ hằng tuần',
            'holiday' => 'Làm thêm ngày lễ, Tết',
        ];
        foreach ($otHoursByType as $type => $hours) {
            $multiplier = $otMultipliers[$type];
            $amount = $hours * $hourlyRate * $multiplier;
            $otPay += $amount;
            if ($multiplier > 1) {
                $taxExemptOvertime += $hours * $hourlyRate * ($multiplier - 1);
            }
            if ($hours > 0) {
                $otLines[] = [
                    'key' => 'ot_' . $type,
                    'label' => $otLabels[$type] . ' (' . self::pct($multiplier) . ')',
                    'formula' => self::num($hours) . ' giờ × ' . self::money($hourlyRate) . ' × ' . self::pct($multiplier),
                    'quantity' => round($hours, 2),
                    'unit_rate' => round($hourlyRate * $multiplier, 2),
                    'amount' => round($amount, 2),
                    'taxable' => round($hours * $hourlyRate, 2),
                ];
            }
        }

        // ---- 2 + tổng Gross ----
        $grossSalary = $proRatedBaseSalary + $allowance + $otPay;

        // ---- 4. Bảo hiểm bắt buộc ----
        $siCap = PayrollConfig::socialInsuranceCap();
        $uiCap = PayrollConfig::unemploymentInsuranceCap($region);
        $siBase = min($insuranceSalary, $siCap);
        $uiBase = min($insuranceSalary, $uiCap);
        $insuranceLines = [];
        $socialInsurance = 0.0;
        $insuranceSpec = [
            'bhxh' => ['Bảo hiểm xã hội (BHXH)', $siBase, $siCap],
            'bhyt' => ['Bảo hiểm y tế (BHYT)', $siBase, $siCap],
            'bhtn' => ['Bảo hiểm thất nghiệp (BHTN)', $uiBase, $uiCap],
        ];
        $employerLines = [];
        $employerTotal = 0.0;
        foreach ($insuranceSpec as $key => [$label, $base, $cap]) {
            $rate = PayrollConfig::EMPLOYEE_RATES[$key];
            $amount = $base * $rate;
            $socialInsurance += $amount;
            $insuranceLines[] = [
                'key' => $key,
                'label' => $label,
                'rate' => $rate,
                'base' => round($base, 2),
                'cap' => $cap,
                'capped' => $insuranceSalary > $cap,
                'formula' => self::money($base) . ' × ' . self::pct($rate),
                'amount' => round($amount, 2),
            ];
            $employerRate = PayrollConfig::EMPLOYER_RATES[$key];
            $employerAmount = $base * $employerRate;
            $employerTotal += $employerAmount;
            $employerLines[] = [
                'key' => $key,
                'label' => $label,
                'rate' => $employerRate,
                'formula' => self::money($base) . ' × ' . self::pct($employerRate),
                'amount' => round($employerAmount, 2),
            ];
        }

        // ---- 5. Thuế TNCN ----
        $taxRules = PayrollConfig::taxRules($taxYear);
        $personalDeduction = $taxRules['personal_deduction'];
        $dependentDeduction = $dependents * $taxRules['dependent_deduction'];
        $taxDeduction = $personalDeduction + $dependentDeduction;
        $totalDeduction = $socialInsurance + $taxDeduction;
        $taxableIncome = $grossSalary - $totalDeduction - $taxExemptOvertime;
        $taxBrackets = [];
        $personalTax = 0.0;
        if ($taxableIncome > 0) {
            [$personalTax, $taxBrackets] = self::progressiveTax($taxableIncome, $taxRules['brackets']);
        } else {
            $taxableIncome = 0.0;
        }

        // ---- 6. Thực nhận ----
        $netSalary = $grossSalary - $socialInsurance - $personalTax;

        $earnings = [];
        $earnings[] = [
            'key' => 'worked_pay',
            'label' => 'Lương theo ngày đi làm thực tế',
            'formula' => self::money($effectiveBase) . ' ÷ ' . self::num($standardDays) . ' công × ' . self::num($actualDays) . ' ngày',
            'quantity' => $actualDays,
            'unit_rate' => round($dailyRate, 2),
            'amount' => round($workedPay, 2),
        ];
        if ($paidLeaveCounted > 0) {
            $earnings[] = [
                'key' => 'paid_leave_pay',
                'label' => 'Lương ngày nghỉ phép năm có hưởng lương (Điều 113)',
                'formula' => self::money($dailyRate) . ' × ' . self::num($paidLeaveCounted) . ' ngày',
                'quantity' => $paidLeaveCounted,
                'unit_rate' => round($dailyRate, 2),
                'amount' => round($leavePay, 2),
            ];
        }
        if ($paidHolidayDays > 0) {
            $earnings[] = [
                'key' => 'holiday_pay',
                'label' => 'Lương ngày lễ, Tết được nghỉ hưởng nguyên lương (Điều 112)',
                'formula' => self::money($dailyRate) . ' × ' . self::num($paidHolidayDays) . ' ngày',
                'quantity' => $paidHolidayDays,
                'unit_rate' => round($dailyRate, 2),
                'amount' => round($holidayPay, 2),
            ];
        }
        if ($allowance > 0) {
            $earnings[] = [
                'key' => 'allowance',
                'label' => 'Phụ cấp cố định theo hợp đồng',
                'formula' => 'Theo hợp đồng lao động',
                'quantity' => 1,
                'unit_rate' => round($allowance, 2),
                'amount' => round($allowance, 2),
            ];
        }
        $earnings = array_merge($earnings, $otLines);

        $notes = [];
        if ($salaryRate < 1) {
            $notes[] = 'Đang trong thời gian thử việc: hưởng ' . self::pct($salaryRate) . ' mức lương hợp đồng (tối thiểu 85% theo Điều 26 BLLĐ 2019).';
        }
        if ($insuranceSalary > $siCap) {
            $notes[] = 'Lương đóng BHXH/BHYT vượt trần 20 lần lương cơ sở (' . self::money($siCap) . ') nên chỉ đóng trên mức trần.';
        }
        if ($taxExemptOvertime > 0) {
            $notes[] = 'Phần tiền làm thêm cao hơn lương giờ bình thường (' . self::money($taxExemptOvertime) . ') được miễn thuế TNCN.';
        }
        if ($paidLeaveDays > $paidLeaveCounted) {
            $notes[] = 'Một phần ngày phép không cộng thêm vì đã đủ công chuẩn trong tháng.';
        }
        if ($taxableIncome <= 0) {
            $notes[] = 'Thu nhập sau giảm trừ chưa đến ngưỡng chịu thuế nên thuế TNCN = 0đ.';
        }

        $breakdown = [
            'version' => 2,
            'tax_year' => $taxYear,
            'inputs' => [
                'base_salary' => round($baseSalary, 2),
                'salary_rate' => $salaryRate,
                'effective_base_salary' => round($effectiveBase, 2),
                'insurance_salary' => round($insuranceSalary, 2),
                'allowance' => round($allowance, 2),
                'dependents' => $dependents,
                'standard_days' => $standardDays,
                'standard_hours' => $standardHours,
                'daily_rate' => round($dailyRate, 2),
                'hourly_rate' => round($hourlyRate, 2),
                'region' => $region,
            ],
            'attendance' => [
                'actual_days' => $actualDays,
                'paid_leave_days' => $paidLeaveDays,
                'paid_leave_days_counted' => $paidLeaveCounted,
                'holiday_days' => $holidayDays,
                'holiday_days_counted' => $paidHolidayDays,
                'paid_days' => $paidDays,
                'unpaid_days' => max(0.0, $standardDays - $paidDays),
                'late_count' => (int) ($in['late_count'] ?? 0),
                'remote_days' => (float) ($in['remote_days'] ?? 0),
                'unpaid_leave_days' => (float) ($in['unpaid_leave_days'] ?? 0),
                'sick_leave_days' => (float) ($in['sick_leave_days'] ?? 0),
                'absent_days' => (float) ($in['absent_days'] ?? 0),
                'ot_hours' => $otHours,
                'ot_weekday_hours' => $otWeekday,
                'ot_weekend_hours' => $otWeekend,
                'ot_holiday_hours' => $otHoliday,
            ],
            'earnings' => $earnings,
            'insurance' => $insuranceLines,
            'tax' => [
                'gross_income' => round($grossSalary, 2),
                'insurance_deduction' => round($socialInsurance, 2),
                'personal_deduction' => $personalDeduction,
                'dependent_deduction_each' => $taxRules['dependent_deduction'],
                'dependents' => $dependents,
                'dependent_deduction' => $dependentDeduction,
                'tax_exempt_overtime' => round($taxExemptOvertime, 2),
                'taxable_income' => round($taxableIncome, 2),
                'brackets' => $taxBrackets,
                'personal_tax' => round($personalTax, 2),
                'effective_rate' => $grossSalary > 0 ? round($personalTax / $grossSalary, 4) : 0,
            ],
            'employer' => [
                'lines' => $employerLines,
                'total' => round($employerTotal, 2),
                'total_cost' => round($grossSalary + $employerTotal, 2),
            ],
            'summary' => [
                'gross_salary' => round($grossSalary, 2),
                'total_insurance' => round($socialInsurance, 2),
                'personal_tax' => round($personalTax, 2),
                'total_withheld' => round($socialInsurance + $personalTax, 2),
                'net_salary' => round($netSalary, 2),
            ],
            'notes' => $notes,
        ];

        return [
            'base_salary' => round($baseSalary, 2),
            'actual_days' => $actualDays,
            'standard_days' => $standardDays,
            'ot_hours' => $otHours,
            'pro_rated_salary' => round($proRatedBaseSalary, 2),
            'allowance' => round($allowance, 2),
            'ot_pay' => round($otPay, 2),
            'gross_salary' => round($grossSalary, 2),
            'social_insurance' => round($socialInsurance, 2),
            'tax_deduction' => round($taxDeduction, 2),
            'tax_exempt_overtime' => round($taxExemptOvertime, 2),
            'total_deduction' => round($totalDeduction, 2),
            'taxable_income' => round($taxableIncome, 2),
            'personal_tax' => round($personalTax, 2),
            'net_salary' => round($netSalary, 2),
            'breakdown' => $breakdown,
        ];
    }

    /** @return array{0: float, 1: array} tổng thuế và chi tiết từng bậc đã áp dụng */
    private static function progressiveTax(float $income, array $brackets): array
    {
        $tax = 0.0;
        $lines = [];
        foreach ($brackets as $i => [$from, $to, $rate]) {
            if ($income <= $from) {
                break;
            }
            $upper = $to === null ? $income : min($income, $to);
            $portion = $upper - $from;
            $amount = $portion * $rate;
            $tax += $amount;
            $lines[] = [
                'level' => $i + 1,
                'from' => $from,
                'to' => $to,
                'rate' => $rate,
                'taxable' => round($portion, 2),
                'tax' => round($amount, 2),
                'formula' => self::money($portion) . ' × ' . self::pct($rate),
            ];
        }
        return [$tax, $lines];
    }

    private static function money(float $value): string
    {
        return number_format(round($value), 0, ',', '.') . 'đ';
    }

    private static function num(float $value): string
    {
        return rtrim(rtrim(number_format($value, 2, ',', '.'), '0'), ',');
    }

    private static function pct(float $rate): string
    {
        return self::num($rate * 100) . '%';
    }
}
