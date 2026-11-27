<?php

/**
 * Phiếu lương HTML tải về / in — diễn giải đầy đủ từng khoản giống màn hình nhân viên.
 */
class PayslipRenderer
{
    public function render(array $payslip): string
    {
        $b = is_array($payslip['breakdown'] ?? null) ? $payslip['breakdown'] : null;

        $html = '<!doctype html><html lang="vi"><head><meta charset="utf-8">'
            . '<meta name="viewport" content="width=device-width, initial-scale=1">'
            . '<title>Phiếu lương ' . $this->e($payslip['month_year']) . ' — PeopleOS</title>'
            . '<style>body{font:14px/1.5 -apple-system,Segoe UI,Arial,sans-serif;color:#1d1d1f;max-width:820px;margin:32px auto;padding:0 20px}'
            . 'h1{font-size:24px;margin:0}h2{font-size:15px;margin:28px 0 8px;text-transform:uppercase;letter-spacing:.04em;color:#6e6e73}'
            . '.meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin-top:16px;color:#424245}'
            . 'table{width:100%;border-collapse:collapse}th,td{padding:8px 10px;border-bottom:1px solid #e5e5ea;text-align:left;vertical-align:top}'
            . 'td.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.f{color:#6e6e73;font-size:12px}'
            . 'tr.total td{font-weight:600;border-top:2px solid #1d1d1f}.net{margin-top:24px;padding:16px;border-radius:12px;background:#f5f5f7;display:flex;justify-content:space-between;font-size:20px;font-weight:700}'
            . 'ul{color:#424245;padding-left:20px}@media print{body{margin:0 auto}}</style>'
            . '</head><body><h1>PHIẾU LƯƠNG · PeopleOS</h1>'
            . '<div class="meta">'
            . '<div>Kỳ lương: <strong>' . $this->e($payslip['month_year']) . '</strong></div>'
            . '<div>Trạng thái: ' . $this->e($payslip['period_status']) . '</div>'
            . '<div>Nhân viên: <strong>' . $this->e($payslip['full_name']) . '</strong> (' . $this->e($payslip['employee_code']) . ')</div>'
            . '<div>Phòng ban: ' . $this->e($payslip['department'] ?? '') . '</div>'
            . '</div>';

        if ($b === null) {
            return $html . $this->simpleTable($payslip) . '</body></html>';
        }

        $att = $b['attendance'];
        $in = $b['inputs'];
        $html .= '<h2>1. Căn cứ tính lương</h2><table><tbody>'
            . $this->row('Lương hợp đồng', $this->money($in['base_salary']))
            . ($in['salary_rate'] < 1 ? $this->row('Hệ số lương thử việc', $this->pct($in['salary_rate'])) : '')
            . $this->row('Lương đóng bảo hiểm', $this->money($in['insurance_salary']))
            . $this->row('Công chuẩn trong tháng', $this->num($in['standard_days']) . ' ngày (' . $this->num($in['standard_hours']) . ' giờ)')
            . $this->row('Đơn giá 1 ngày công', $this->money($in['daily_rate']))
            . $this->row('Đơn giá 1 giờ công', $this->money($in['hourly_rate']))
            . $this->row('Người phụ thuộc', (int) $in['dependents'] . ' người')
            . '</tbody></table>';

        $html .= '<h2>2. Chuyên cần trong kỳ</h2><table><tbody>'
            . $this->row('Ngày đi làm thực tế', $this->num($att['actual_days']) . ' ngày')
            . $this->row('Trong đó làm từ xa', $this->num($att['remote_days']) . ' ngày')
            . $this->row('Số lần đi muộn', (int) $att['late_count'] . ' lần')
            . $this->row('Phép năm hưởng lương', $this->num($att['paid_leave_days_counted']) . ' ngày')
            . $this->row('Ngày lễ hưởng lương', $this->num($att['holiday_days_counted']) . ' ngày')
            . $this->row('Nghỉ không lương / nghỉ ốm (BHXH chi trả)', $this->num($att['unpaid_leave_days']) . ' / ' . $this->num($att['sick_leave_days']) . ' ngày')
            . $this->row('Vắng không phép', $this->num($att['absent_days']) . ' ngày')
            . $this->row('Tổng ngày hưởng lương', $this->num($att['paid_days']) . ' / ' . $this->num($in['standard_days']) . ' ngày')
            . $this->row('Giờ làm thêm (thường / nghỉ tuần / lễ)', $this->num($att['ot_weekday_hours']) . ' / ' . $this->num($att['ot_weekend_hours']) . ' / ' . $this->num($att['ot_holiday_hours']) . ' giờ')
            . '</tbody></table>';

        $html .= '<h2>3. Các khoản thu nhập</h2><table><tbody>';
        foreach ($b['earnings'] as $line) {
            $html .= $this->row($line['label'], $this->money($line['amount']), $line['formula']);
        }
        $html .= '<tr class="total"><td>Tổng thu nhập (Gross)</td><td class="n">' . $this->money($b['summary']['gross_salary']) . '</td></tr></tbody></table>';

        $html .= '<h2>4. Bảo hiểm bắt buộc người lao động đóng</h2><table><tbody>';
        foreach ($b['insurance'] as $line) {
            $html .= $this->row($line['label'] . ($line['capped'] ? ' — áp trần' : ''), $this->money($line['amount']), $line['formula']);
        }
        $html .= '<tr class="total"><td>Tổng bảo hiểm</td><td class="n">' . $this->money($b['summary']['total_insurance']) . '</td></tr></tbody></table>';

        $t = $b['tax'];
        $html .= '<h2>5. Thuế thu nhập cá nhân</h2><table><tbody>'
            . $this->row('Tổng thu nhập', $this->money($t['gross_income']))
            . $this->row('(−) Bảo hiểm bắt buộc', $this->money($t['insurance_deduction']))
            . $this->row('(−) Giảm trừ bản thân', $this->money($t['personal_deduction']))
            . $this->row('(−) Giảm trừ người phụ thuộc', $this->money($t['dependent_deduction']), (int) $t['dependents'] . ' × ' . $this->money($t['dependent_deduction_each']))
            . $this->row('(−) Tiền làm thêm được miễn thuế', $this->money($t['tax_exempt_overtime']))
            . '<tr class="total"><td>Thu nhập tính thuế</td><td class="n">' . $this->money($t['taxable_income']) . '</td></tr>';
        foreach ($t['brackets'] as $br) {
            $range = $this->money($br['from']) . ' – ' . ($br['to'] === null ? 'trở lên' : $this->money($br['to']));
            $html .= $this->row('Bậc ' . $br['level'] . ' (' . $this->pct($br['rate']) . ')', $this->money($br['tax']), $range . ' · ' . $br['formula']);
        }
        $html .= '<tr class="total"><td>Thuế TNCN phải nộp</td><td class="n">' . $this->money($t['personal_tax']) . '</td></tr></tbody></table>';

        $html .= '<div class="net"><span>THỰC NHẬN (NET)</span><span>' . $this->money($b['summary']['net_salary']) . '</span></div>';

        $html .= '<h2>6. Công ty đóng thêm cho bạn (không trừ vào lương)</h2><table><tbody>';
        foreach ($b['employer']['lines'] as $line) {
            $html .= $this->row($line['label'], $this->money($line['amount']), $line['formula']);
        }
        $html .= '<tr class="total"><td>Tổng chi phí công ty cho bạn</td><td class="n">' . $this->money($b['employer']['total_cost']) . '</td></tr></tbody></table>';

        if (!empty($b['notes'])) {
            $html .= '<h2>Ghi chú</h2><ul>';
            foreach ($b['notes'] as $note) {
                $html .= '<li>' . $this->e($note) . '</li>';
            }
            $html .= '</ul>';
        }

        return $html . '</body></html>';
    }

    private function simpleTable(array $p): string
    {
        $rows = [
            ['Ngày công thực tế', $this->num($p['actual_days']) . ' / ' . (int) $p['standard_days'] . ' ngày'],
            ['Giờ làm thêm (OT)', $this->num($p['ot_hours']) . ' giờ'],
            ['Tổng thu nhập (Gross)', $this->money($p['gross_salary'])],
            ['Bảo hiểm bắt buộc', $this->money($p['social_insurance'])],
            ['Giảm trừ gia cảnh', $this->money($p['tax_deduction'])],
            ['Thuế thu nhập cá nhân', $this->money($p['personal_tax'])],
        ];
        $html = '<h2>Tóm tắt</h2><table><tbody>';
        foreach ($rows as [$label, $value]) {
            $html .= $this->row($label, $value);
        }
        return $html . '</tbody></table><div class="net"><span>THỰC NHẬN (NET)</span><span>' . $this->money($p['net_salary']) . '</span></div>';
    }

    private function row(string $label, string $value, ?string $formula = null): string
    {
        return '<tr><td>' . $this->e($label) . ($formula ? '<div class="f">' . $this->e($formula) . '</div>' : '')
            . '</td><td class="n">' . $this->e($value) . '</td></tr>';
    }

    private function money($value): string
    {
        return number_format((float) $value, 0, ',', '.') . 'đ';
    }

    private function num($value): string
    {
        return rtrim(rtrim(number_format((float) $value, 2, ',', '.'), '0'), ',');
    }

    private function pct($rate): string
    {
        return $this->num((float) $rate * 100) . '%';
    }

    private function e($value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
