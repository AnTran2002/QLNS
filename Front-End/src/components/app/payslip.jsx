import { PersonAvatar } from "@/components/app/kit";
import { formatMoney, formatNumber, formatPeriod } from "@/lib/format";
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

const pct = (rate) => `${(Number(rate) * 100).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`;

function LineRow({ label, formula, value, negative, strong, muted }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
      <div className="min-w-0">
        <p className={cn("text-[13.5px]", strong ? "font-semibold text-foreground" : muted ? "text-muted-foreground" : "text-foreground/85")}>{label}</p>
        {formula && <p className="font-mono text-[11.5px] break-words text-muted-foreground">{formula}</p>}
      </div>
      <p className={cn("shrink-0 text-right text-[13.5px] tabular-nums", strong ? "font-semibold text-foreground" : muted ? "text-muted-foreground" : "text-foreground/85")}>
        {negative && Number(value) > 0 ? "− " : ""}
        {formatMoney(value)}
      </p>
    </div>
  );
}

function Chip({ label, value }) {
  return (
    <div className="rounded-lg bg-muted/60 px-3 py-2">
      <p className="text-[11.5px] text-muted-foreground">{label}</p>
      <p className="text-[13.5px] font-medium tabular-nums">{value}</p>
    </div>
  );
}

/** Phiếu lương chi tiết từ `payroll_items.breakdown` (PayrollEngine::calculateDetailed, version 2). */
function DetailedBreakdown({ item, b }) {
  const { inputs = {}, attendance: a = {}, earnings = [], insurance = [], tax = {}, employer, summary = {}, notes = [] } = b;
  const net = summary.net_salary ?? item.net_salary;
  const gross = summary.gross_salary ?? item.gross_salary;
  const payout = { gross_salary: gross, net_salary: net, social_insurance: summary.total_insurance ?? item.social_insurance, personal_tax: summary.personal_tax ?? item.personal_tax };
  const attendanceChips = [
    ["Ngày đi làm", `${formatNumber(a.actual_days)} ngày`],
    a.paid_leave_days_counted > 0 && ["Phép có lương", `${formatNumber(a.paid_leave_days_counted)} ngày`],
    a.holiday_days_counted > 0 && ["Nghỉ lễ hưởng lương", `${formatNumber(a.holiday_days_counted)} ngày`],
    ["Công hưởng lương", `${formatNumber(a.paid_days)} / ${formatNumber(inputs.standard_days)}`],
    a.unpaid_days > 0 && ["Không hưởng lương", `${formatNumber(a.unpaid_days)} ngày`],
    a.late_count > 0 && ["Đi muộn", `${formatNumber(a.late_count)} lần`],
    a.remote_days > 0 && ["Làm từ xa", `${formatNumber(a.remote_days)} ngày`],
    a.sick_leave_days > 0 && ["Nghỉ ốm (BHXH chi trả)", `${formatNumber(a.sick_leave_days)} ngày`],
    a.unpaid_leave_days > 0 && ["Nghỉ không lương", `${formatNumber(a.unpaid_leave_days)} ngày`],
    a.absent_days > 0 && ["Vắng không phép", `${formatNumber(a.absent_days)} ngày`],
    ["Giờ làm thêm", `${formatNumber(a.ot_hours)} giờ`],
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      <Group title="Căn cứ tính lương">
        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
          <Chip label="Lương theo hợp đồng" value={formatMoney(inputs.base_salary)} />
          {inputs.salary_rate < 1 && <Chip label={`Thử việc (${pct(inputs.salary_rate)})`} value={formatMoney(inputs.effective_base_salary)} />}
          <Chip label="Công chuẩn tháng" value={`${formatNumber(inputs.standard_days)} ngày · ${formatNumber(inputs.standard_hours)} giờ`} />
          <Chip label="Đơn giá 1 ngày công" value={formatMoney(inputs.daily_rate)} />
          <Chip label="Đơn giá 1 giờ" value={formatMoney(inputs.hourly_rate)} />
          <Chip label="Lương đóng bảo hiểm" value={formatMoney(inputs.insurance_salary)} />
          <Chip label="Vùng lương tối thiểu" value={`Vùng ${inputs.region ?? "—"}`} />
        </div>
      </Group>

      <Group title="Chấm công trong kỳ">
        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
          {attendanceChips.map(([k, v]) => <Chip key={k} label={k} value={v} />)}
        </div>
        {(a.ot_weekday_hours > 0 || a.ot_weekend_hours > 0 || a.ot_holiday_hours > 0) && (
          <p className="px-4 py-2 text-[12px] text-muted-foreground">
            OT: ngày thường {formatNumber(a.ot_weekday_hours)}h · ngày nghỉ tuần {formatNumber(a.ot_weekend_hours)}h · ngày lễ {formatNumber(a.ot_holiday_hours)}h
          </p>
        )}
      </Group>

      <Group title="Thu nhập">
        {earnings.map((l) => <LineRow key={l.key} label={l.label} formula={l.formula} value={l.amount} />)}
        <LineRow label="Tổng thu nhập (Gross)" value={gross} strong />
      </Group>

      <Group title="Bảo hiểm bắt buộc (người lao động đóng)">
        {insurance.map((l) => (
          <LineRow key={l.key} label={l.label} formula={`${l.formula}${l.capped ? ` · trần ${formatMoney(l.cap)}` : ""}`} value={l.amount} negative />
        ))}
        <LineRow label="Tổng bảo hiểm" value={summary.total_insurance ?? item.social_insurance} negative strong />
      </Group>

      <Group title={`Thuế thu nhập cá nhân (biểu lũy tiến ${b.tax_year ?? ""})`}>
        <LineRow label="Tổng thu nhập" value={tax.gross_income} muted />
        {tax.tax_exempt_overtime > 0 && <LineRow label="Phần OT vượt lương giờ thường (miễn thuế)" value={tax.tax_exempt_overtime} negative muted />}
        <LineRow label="Bảo hiểm bắt buộc" value={tax.insurance_deduction} negative muted />
        <LineRow label="Giảm trừ bản thân" value={tax.personal_deduction} negative muted />
        {tax.dependents > 0 && (
          <LineRow
            label={`Giảm trừ ${tax.dependents} người phụ thuộc`}
            formula={`${tax.dependents} × ${formatMoney(tax.dependent_deduction_each)}`}
            value={tax.dependent_deduction}
            negative
            muted
          />
        )}
        <LineRow label="Thu nhập tính thuế" value={tax.taxable_income} strong />
        {(tax.brackets ?? []).map((br) => (
          <LineRow
            key={br.level}
            label={`Bậc ${br.level}: ${formatMoneyShortRange(br.from, br.to)} · ${pct(br.rate)}`}
            formula={br.formula}
            value={br.tax}
            muted
          />
        ))}
        <LineRow
          label="Thuế TNCN phải nộp"
          formula={tax.effective_rate > 0 ? `Thuế suất thực tế ${pct(tax.effective_rate)} trên Gross` : null}
          value={tax.personal_tax}
          negative
          strong
        />
      </Group>

      <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/[0.04] p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[13.5px] font-semibold">Thực nhận (Net)</p>
            <p className="font-mono text-[11.5px] text-muted-foreground">Gross − Bảo hiểm − Thuế TNCN</p>
          </div>
          <p className="font-display text-[26px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{formatMoney(net)}</p>
        </div>
        <PayoutBar item={payout} />
      </div>

      {employer?.lines?.length > 0 && (
        <details className="group overflow-hidden rounded-xl border border-border/80">
          <summary className="flex cursor-pointer list-none items-center justify-between bg-muted/50 px-4 py-2 text-[12px] font-medium text-muted-foreground">
            Công ty đóng thêm cho bạn
            <span className="tabular-nums text-foreground">{formatMoney(employer.total)}</span>
          </summary>
          <div className="divide-y divide-border/60">
            {employer.lines.map((l) => <LineRow key={l.key} label={l.label} formula={l.formula} value={l.amount} muted />)}
            <LineRow label="Tổng chi phí nhân sự của công ty" formula="Gross + bảo hiểm phần công ty" value={employer.total_cost} strong />
          </div>
        </details>
      )}

      {notes.length > 0 && (
        <ul className="space-y-1.5 rounded-xl bg-muted/50 p-3.5 text-[12.5px] text-muted-foreground">
          {notes.map((n) => (
            <li key={n} className="flex gap-2">
              <span className="mt-[7px] size-1 shrink-0 rounded-full bg-muted-foreground" aria-hidden="true" />
              {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const shortMoney = (v) => `${(Number(v) / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;
const formatMoneyShortRange = (from, to) => (to === null || to === undefined ? `trên ${shortMoney(from)}` : `${shortMoney(from)}–${shortMoney(to)}`);

/**
 * Bảng chi tiết lương. `item` là dòng payroll_items. Có `item.breakdown` (diễn giải lưu lúc chạy lương) → phiếu chi tiết đầy đủ;
 * phiếu cũ trước khi có diễn giải → bảng tóm tắt theo các cột đã lưu.
 * `detail` (tuỳ chọn) là kết quả `calculation` từ PayrollEngine.
 */
export function PayslipBreakdown({ item, detail, className }) {
  const b = item?.breakdown ?? detail?.breakdown;
  if (b && b.version >= 2) {
    return (
      <div className={className}>
        <DetailedBreakdown item={item} b={b} />
      </div>
    );
  }
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
        {"ot_pay" in d && <Row label="Làm thêm giờ" sub={`${formatNumber(item.ot_hours)} giờ`} value={d.ot_pay} />}
        <Row
          label="Tổng thu nhập (Gross)"
          sub={"pro_rated_salary" in d ? null : `${formatNumber(item.actual_days)} ngày công · ${formatNumber(item.ot_hours)} giờ OT`}
          value={item.gross_salary}
          strong
        />
      </Group>
      <Group title="Khấu trừ">
        <Row label="BHXH, BHYT, BHTN" value={item.social_insurance} negative />
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
      <p className="text-[12px] text-muted-foreground">
        Phiếu lương kỳ này được tính trước khi hệ thống lưu diễn giải chi tiết — chỉ hiển thị số tổng đã chốt.
      </p>
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
