import { formatMoney, formatNumber, formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";

function Row({ label, value, sub, strong, negative, className }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-2.5", className)}>
      <div>
        <p className={cn("text-[14px]", strong ? "font-medium text-ink" : "text-body")}>{label}</p>
        {sub && <p className="text-[12px] text-muted-foreground">{sub}</p>}
      </div>
      <p className={cn("tabular text-right text-[14px]", strong ? "font-medium text-ink" : "text-body", negative && "text-[#a9583e]")}>
        {negative ? "− " : ""}{formatMoney(value)}
      </p>
    </div>
  );
}

/**
 * Bảng chi tiết lương. `item` là dòng payroll_items; `detail` (tuỳ chọn) là
 * kết quả `calculation` từ PayrollEngine (có thêm pro_rated_salary, ot_pay, allowance, taxable_income).
 */
export function PayslipBreakdown({ item, detail, className }) {
  const d = detail ?? {};
  return (
    <div className={cn("divide-y divide-hairline-soft", className)}>
      <div className="pb-2">
        <p className="caption-upper pb-1 text-muted-foreground">Thu nhập</p>
        {"pro_rated_salary" in d && (
          <Row label="Lương theo ngày công" sub={`${formatNumber(item.actual_days)} / ${formatNumber(item.standard_days ?? d.standard_days)} ngày`} value={d.pro_rated_salary} />
        )}
        {"allowance" in d && <Row label="Phụ cấp cố định" value={d.allowance} />}
        {"ot_pay" in d && <Row label="Làm thêm giờ (×1,5)" sub={`${formatNumber(item.ot_hours)} giờ`} value={d.ot_pay} />}
        <Row
          label="Tổng thu nhập (Gross)"
          sub={"pro_rated_salary" in d ? null : `${formatNumber(item.actual_days)} ngày công · ${formatNumber(item.ot_hours)} giờ OT`}
          value={item.gross_salary}
          strong
        />
      </div>
      <div className="py-2">
        <p className="caption-upper pt-2 pb-1 text-muted-foreground">Khấu trừ</p>
        <Row label="BHXH, BHYT, BHTN (10,5%)" value={item.social_insurance} negative />
        <Row label="Thuế thu nhập cá nhân" sub={`Giảm trừ gia cảnh ${formatMoney(item.tax_deduction)}`} value={item.personal_tax} negative />
        {"taxable_income" in d && <Row label="Thu nhập tính thuế" value={d.taxable_income} className="opacity-80" />}
      </div>
      <div className="flex items-baseline justify-between gap-4 pt-4">
        <p className="font-medium text-ink">Thực nhận (Net)</p>
        <p className="tabular font-serif text-[28px] leading-none tracking-[-0.5px] text-ink">{formatMoney(item.net_salary)}</p>
      </div>
    </div>
  );
}

/** Đầu phiếu lương: bề mặt tối kiểu product-mockup-card-dark */
export function PayslipHeader({ name, code, department, position, monthYear }) {
  return (
    <div className="rounded-lg bg-surface-dark p-5 text-on-dark">
      <p className="caption-upper text-primary">Phiếu lương · {formatPeriod(monthYear)}</p>
      <p className="mt-2 font-serif text-[24px] leading-tight tracking-[-0.3px]">{name}</p>
      <p className="mt-1 text-[13px] text-on-dark-soft">
        <span className="font-mono">{code}</span>
        {department ? ` · ${department}` : ""}
        {position ? ` · ${position}` : ""}
      </p>
    </div>
  );
}
