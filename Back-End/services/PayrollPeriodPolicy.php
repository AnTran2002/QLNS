<?php

class PayrollPeriodPolicy
{
    public static function validateCreationMonth(string $monthYear, ?DateTimeImmutable $today = null): ?string
    {
        if (preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $monthYear) !== 1) {
            return 'month_year phải có định dạng YYYY-MM';
        }

        $currentMonth = ($today ?? new DateTimeImmutable('today'))->format('Y-m');
        if ($monthYear < $currentMonth) {
            return 'Không thể tạo kỳ lương cho tháng đã qua';
        }

        return null;
    }
}
