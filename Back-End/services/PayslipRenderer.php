<?php

class PayslipRenderer
{
    public function render(array $payslip): string
    {
        $tax = PayrollEngine::taxBreakdown($payslip);
        $rows = [
            ['Ngày công thực tế', $this->number($payslip['actual_days']) . ' / ' . (int) $payslip['standard_days'] . ' ngày'],
            ['Giờ làm thêm (OT)', $this->number($payslip['ot_hours']) . ' giờ'],
            ['Tổng thu nhập (Gross)', $this->money($payslip['gross_salary'])],
            ['Bảo hiểm bắt buộc (BHXH 8%, BHYT 1,5%, BHTN 1%)', '− ' . $this->money($payslip['social_insurance'])],
            ['Giảm trừ gia cảnh (không trừ vào lương) — bản thân '
                . $this->money($tax['personal_deduction'])
                . ($tax['dependents_count'] > 0 ? ' + ' . $tax['dependents_count'] . ' người phụ thuộc × ' . $this->money(PayrollEngine::DEPENDENT_DEDUCTION) : ''),
                $this->money($payslip['tax_deduction'])],
            ['Thu nhập tính thuế', $this->money($tax['taxable_income'])],
            ['Thuế thu nhập cá nhân (biểu lũy tiến 5 bậc, 2026)', '− ' . $this->money($payslip['personal_tax'])],
            ['Thực nhận (Net)', $this->money($payslip['net_salary'])],
        ];

        $tableRows = '';
        foreach ($rows as [$label, $value]) {
            $tableRows .= '<tr><th>' . $this->escape($label) . '</th><td>' . $this->escape($value) . '</td></tr>';
        }

        return '<!doctype html><html lang="vi"><head><meta charset="utf-8">'
            . '<meta name="viewport" content="width=device-width, initial-scale=1">'
            . '<title>Phiếu lương ' . $this->escape($payslip['month_year']) . '</title>'
            . '<style>body{font:15px Arial,sans-serif;color:#222;max-width:760px;margin:40px auto;padding:0 20px}'
            . 'h1{font-size:24px}p{color:#555}table{width:100%;border-collapse:collapse;margin-top:24px}'
            . 'th,td{padding:12px;border-bottom:1px solid #ddd;text-align:left}td{text-align:right;font-variant-numeric:tabular-nums}'
            . 'tr:last-child{font-weight:bold;font-size:18px}@media print{body{margin:0 auto}}</style>'
            . '</head><body><h1>PHIẾU LƯƠNG</h1>'
            . '<p>Kỳ lương: <strong>' . $this->escape($payslip['month_year']) . '</strong></p>'
            . '<p>Nhân viên: <strong>' . $this->escape($payslip['full_name']) . '</strong>'
            . ' (' . $this->escape($payslip['employee_code']) . ')</p>'
            . '<p>Phòng ban: ' . $this->escape($payslip['department'] ?? '') . '</p>'
            . '<p>Trạng thái kỳ lương: ' . $this->escape($payslip['period_status']) . '</p>'
            . '<table><tbody>' . $tableRows . '</tbody></table>'
            . '</body></html>';
    }

    private function money($value): string
    {
        return number_format((float) $value, 0, ',', '.') . ' VND';
    }

    private function number($value): string
    {
        return rtrim(rtrim(number_format((float) $value, 2, '.', ','), '0'), '.');
    }

    private function escape($value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
