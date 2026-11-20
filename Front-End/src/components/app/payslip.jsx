import { PersonAvatar } from "@/components/app/kit";
import { formatMoney, formatNumber, formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";

/* Màu cơ cấu chi trả — khớp biểu đồ ở dashboard (đã kiểm tra mù màu / tương phản). */
export const PAYOUT_PARTS = [
  { key: "net_salary", label: "Thực nhận", color: "var(--chart-1)" },
  { key: "social_insurance", label: "BHXH · BHYT · BHTN", color: "var(--chart-2)" },
  { key: "personal_tax", label: "Thuế TNCN", color: "var(--chart-3)" },
];

function Row({ label, value, sub, strong, negative }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
      <div className="min-w-0">
        <p className={cn("text-[13.5px]", strong ? "font-semibold text-foreground" : "text-foreground/85")}>{label}</p>
        {sub && <p className="text-[12px] text-muted-foreground">{sub}</p>}
      </div>
      <p className={cn("text-right text-[13.5px] tabular-nums", strong ? "font-semibold text-foreground" : "text-foreground/85")}>
        {negative ? "− " : ""}
        {formatMoney(value)}
      </p>
    </div>
  );
}

function Group({ title, children }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border/80">
      <p className="border-b border-border/70 bg-muted/50 px-4 py-2 text-[12px] font-medium text-muted-foreground">{title}</p>
      <div className="divide-y divide-border/60">{children}</div>
    </section>
  );
}

/** Thanh cơ cấu Gross → Thực nhận / BH / Thuế (2px khe giữa các đoạn). */
export function PayoutBar({ item, className }) {
  const gross = Number(item?.gross_salary) || 0;
  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-muted" aria-hidden="true">
        {gross > 0 &&
          PAYOUT_PARTS.map((p) => (
            <div
              key={p.key}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${((Number(item[p.key]) || 0) / gross) * 100}%`, background: p.color }}
            />
          ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
        {PAYOUT_PARTS.map((p) => (
          <li key={p.key} className="flex items-center gap-1.5">
            <span className="size-2 rounded-[3px]" style={{ background: p.color }} aria-hidden="true" />
            {p.label}
            <span className="font-medium text-foreground tabular-nums">
              {gross > 0 ? `${(((Number(item[p.key]) || 0) / gross) * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%` : "—"}
            </span>
          </li>
        ))}
      </ul>
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
    <div className={cn("space-y-3", className)}>
      <Group title="Thu nhập">
        {"pro_rated_salary" in d && (
          <Row
            label="Lương theo ngày công"
            sub={`${formatNumber(item.actual_days)} / ${formatNumber(item.standard_days ?? d.standard_days)} ngày`}
            value={d.pro_rated_salary}
          />
        )}
        {"allowance" in d && <Row label="Phụ cấp cố định" value={d.allowance} />}
        {"ot_pay" in d && <Row label="Làm thêm giờ (×1,5)" sub={`${formatNumber(item.ot_hours)} giờ`} value={d.ot_pay} />}
        <Row
          label="Tổng thu nhập (Gross)"
          sub={"pro_rated_salary" in d ? null : `${formatNumber(item.actual_days)} ngày công · ${formatNumber(item.ot_hours)} giờ OT`}
          value={item.gross_salary}
          strong
        />
      </Group>
      <Group title="Khấu trừ">
        <Row label="BHXH, BHYT, BHTN (10,5%)" value={item.social_insurance} negative />
        <Row label="Thuế thu nhập cá nhân" sub={`Giảm trừ gia cảnh ${formatMoney(item.tax_deduction)}`} value={item.personal_tax} negative />
        {"taxable_income" in d && <Row label="Thu nhập tính thuế" value={d.taxable_income} />}
      </Group>
      <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/[0.04] p-4">
        <div className="flex items-end justify-between gap-4">
          <p className="text-[13.5px] font-semibold">Thực nhận (Net)</p>
          <p className="font-display text-[26px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{formatMoney(item.net_salary)}</p>
        </div>
        <PayoutBar item={item} />
      </div>
    </div>
  );
}

/** Đầu phiếu lương. */
export function PayslipHeader({ name, code, department, position, monthYear, action }) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-border/80 bg-gradient-to-b from-primary/[0.06] to-transparent p-4">
      <PersonAvatar name={name} seed={code} size="md" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-muted-foreground">Phiếu lương · {formatPeriod(monthYear)}</p>
        <p className="truncate text-[17px] font-semibold tracking-[-0.01em]">{name}</p>
        <p className="truncate text-[12.5px] text-muted-foreground">
          <span className="font-mono">{code}</span>
          {department ? ` · ${department}` : ""}
          {position ? ` · ${position}` : ""}
        </p>
      </div>
      {action}
    </div>
  );
}
