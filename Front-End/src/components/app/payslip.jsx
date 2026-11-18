import { Money } from "@/components/app/motion";
import { RevealGroup } from "@/components/app/motion";
import { formatMoney, formatNumber, formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";

function Row({ label, value, sub, strong, negative }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <div>
        <p className={cn("text-[15px]", strong ? "font-semibold text-foreground" : "text-foreground/85")}>{label}</p>
        {sub && <p className="text-[13px] text-muted-foreground">{sub}</p>}
      </div>
      <p className={cn("tabular text-right text-[15px]", strong ? "font-semibold text-foreground" : "text-foreground/85")}>
        {negative ? "− " : ""}
        {formatMoney(value)}
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
    <div className={cn("space-y-4", className)}>
      <div className="rounded-2xl bg-muted/70 px-4 py-1">
        <p className="text-eyebrow pt-3">Thu nhập</p>
        <div className="divide-y divide-border/70">
          <RevealGroup step={40}>
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
          </RevealGroup>
        </div>
      </div>
      <div className="rounded-2xl bg-muted/70 px-4 py-1">
        <p className="text-eyebrow pt-3">Khấu trừ</p>
        <div className="divide-y divide-border/70">
          <RevealGroup step={40} delay={120}>
            <Row label="BHXH, BHYT, BHTN (10,5%)" value={item.social_insurance} negative />
            <Row label="Thuế thu nhập cá nhân" sub={`Giảm trừ gia cảnh ${formatMoney(item.tax_deduction)}`} value={item.personal_tax} negative />
            {"taxable_income" in d && <Row label="Thu nhập tính thuế" value={d.taxable_income} />}
          </RevealGroup>
        </div>
      </div>
      <div className="flex items-end justify-between gap-4 px-1 pt-2">
        <p className="text-[15px] font-semibold text-foreground">Thực nhận (Net)</p>
        <Money value={item.net_salary} className="font-display text-[30px] leading-none font-semibold tracking-[-0.03em] text-foreground" />
      </div>
    </div>
  );
}

/** Đầu phiếu lương — tile tối. */
export function PayslipHeader({ name, code, department, position, monthYear }) {
  return (
    <div className="tile p-6">
      <p className="text-[12px] font-semibold tracking-[0.06em] text-tile-muted uppercase">Phiếu lương · {formatPeriod(monthYear)}</p>
      <p className="mt-3 font-display text-[26px] leading-tight font-semibold tracking-[-0.025em]">{name}</p>
      <p className="mt-1 text-[14px] text-tile-muted">
        <span className="font-mono">{code}</span>
        {department ? ` · ${department}` : ""}
        {position ? ` · ${position}` : ""}
      </p>
    </div>
  );
}
