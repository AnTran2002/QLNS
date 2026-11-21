import { PersonAvatar } from "@/components/app/kit";
import { PAYROLL_RULES, taxableIncomeFromTax } from "@/lib/constants";
import { formatMoney, formatMoneyShort, formatNumber, formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";

/* Màu cơ cấu chi trả — khớp biểu đồ ở dashboard (đã kiểm tra mù màu / tương phản). */
const PAYOUT_PARTS = [
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
      <div className="grow-x flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-muted" aria-hidden="true">
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
 * Bảng chi tiết lương từ một dòng payroll_items.
 * Thuế TNCN 2026: biểu lũy tiến 5 bậc trên thu nhập tính thuế =
 *   Gross − phần OT miễn thuế − BH bắt buộc − giảm trừ gia cảnh (15,5tr + 6,2tr × người phụ thuộc).
 * Giảm trừ gia cảnh chỉ là căn cứ tính thuế, KHÔNG trừ vào tiền lương.
 */
export function PayslipBreakdown({ item, className }) {
  const taxable = taxableIncomeFromTax(Number(item.personal_tax) || 0);
  const dependents = Math.max(0, Math.round(((Number(item.tax_deduction) || 0) - PAYROLL_RULES.personalDeduction) / PAYROLL_RULES.dependentDeduction));
  return (
    <div className={cn("space-y-3", className)}>
      <Group title="Thu nhập">
        <Row
          label="Tổng thu nhập (Gross)"
          sub={`${formatNumber(item.actual_days)}${item.standard_days ? `/${formatNumber(item.standard_days)}` : ""} ngày công · ${formatNumber(item.ot_hours)} giờ OT (×1,5)`}
          value={item.gross_salary}
          strong
        />
      </Group>
      <Group title="Khấu trừ vào lương">
        <Row label="BHXH, BHYT, BHTN (10,5%)" sub="8% + 1,5% + 1% lương đóng bảo hiểm" value={item.social_insurance} negative />
        <Row label="Thuế thu nhập cá nhân" sub="Biểu lũy tiến 5 bậc (5% → 35%) · áp dụng 2026" value={item.personal_tax} negative />
      </Group>
      <Group title="Căn cứ tính thuế TNCN (không trừ vào lương)">
        <Row
          label="Giảm trừ gia cảnh"
          sub={`Bản thân ${formatMoneyShort(PAYROLL_RULES.personalDeduction)}${dependents ? ` + ${dependents} người phụ thuộc × ${formatMoneyShort(PAYROLL_RULES.dependentDeduction)}` : ""}`}
          value={item.tax_deduction}
        />
        <Row
          label="Thu nhập tính thuế"
          sub={taxable > 0 ? "Gross − OT miễn thuế − BH − giảm trừ gia cảnh" : "Thu nhập chưa vượt mức giảm trừ → không phát sinh thuế"}
          value={taxable}
        />
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
