import { motion } from "motion/react";
import { Ban, CalendarCheck2, CalendarOff, Clock3, House, Plane } from "lucide-react";
import { cn } from "@/lib/utils";

/* Trạng thái chấm công (attendance_records.status). Màu luôn đi kèm biểu tượng + nhãn — không chỉ dựa vào màu. */
export const ATTENDANCE_STATUS = {
  PRESENT: { label: "Đúng giờ", icon: CalendarCheck2, dot: "bg-success", chip: "bg-success/10 text-success", worked: true },
  LATE: { label: "Đi muộn", icon: Clock3, dot: "bg-warning", chip: "bg-warning/12 text-warning", worked: true },
  REMOTE: { label: "Làm từ xa", icon: House, dot: "bg-chart-3", chip: "bg-chart-3/12 text-foreground", worked: true },
  LEAVE: { label: "Nghỉ phép", icon: Plane, dot: "bg-link", chip: "bg-link/10 text-link", worked: false },
  ABSENT: { label: "Nghỉ không phép", icon: Ban, dot: "bg-destructive", chip: "bg-destructive/10 text-destructive", worked: false },
};
export const STATUS_ORDER = ["PRESENT", "LATE", "REMOTE", "LEAVE", "ABSENT"];

const WEEK_HEAD = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const pad = (n) => String(n).padStart(2, "0");
export const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = () => dateKey(new Date());

/** Ô lịch của tháng `YYYY-MM`, bắt đầu từ Thứ Hai; ô trống ở đầu/cuối là null. */
export function buildMonth(month, records = []) {
  const [y, m] = month.split("-").map(Number);
  const byDate = Object.fromEntries(records.map((r) => [r.work_date, r]));
  const first = new Date(y, m - 1, 1);
  const days = new Date(y, m, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const today = todayKey();
  const cells = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) {
    const date = new Date(y, m - 1, d);
    const key = dateKey(date);
    const weekday = (date.getDay() + 6) % 7;
    cells.push({
      key,
      day: d,
      weekend: weekday >= 5,
      future: key > today,
      today: key === today,
      record: byDate[key] ?? null,
    });
  }
  while (cells.length % 7) cells.push(null);
  return cells;
}

/** Tổng hợp tháng: số buổi theo trạng thái, giờ làm, OT, phút đi muộn, ngày công chuẩn. */
export function summarizeMonth(cells) {
  const days = cells.filter(Boolean);
  const records = days.map((c) => c.record).filter(Boolean);
  const count = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0]));
  let hours = 0;
  let ot = 0;
  let lateMinutes = 0;
  for (const r of records) {
    count[r.status] = (count[r.status] ?? 0) + 1;
    hours += r.work_hours;
    ot += r.ot_hours;
    if (r.status === "LATE" && r.check_in && r.shift_start) lateMinutes += Math.max(0, minutes(r.check_in) - minutes(r.shift_start));
  }
  const worked = count.PRESENT + count.LATE + count.REMOTE;
  const off = count.LEAVE + count.ABSENT;
  const standard = days.filter((c) => !c.weekend).length;
  const elapsed = days.filter((c) => !c.weekend && !c.future).length;
  return { count, worked, off, hours, ot, lateMinutes, standard, elapsed, recorded: records.length };
}

export const minutes = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + (m || 0);
};

/**
 * Lịch tháng: 7 cột từ Thứ Hai. Ô được chọn có khối nền trượt theo (motion layoutId) giữa các ngày.
 * Màn hẹp chỉ hiện số ngày + chấm trạng thái; rộng hơn hiện giờ vào/ra và nhãn.
 */
export function MonthCalendar({ cells, selected, onSelect, layoutKey = "calendar-selected", className }) {
  return (
    <div className={cn("select-none", className)}>
      <div className="grid grid-cols-7 gap-1 pb-2 text-center text-[11.5px] font-medium text-muted-foreground sm:gap-1.5">
        {WEEK_HEAD.map((d, i) => (
          <span key={d} className={cn(i >= 5 && "text-muted-foreground/60")}>
            {d}
          </span>
        ))}
      </div>
      <div role="grid" aria-label="Lịch chấm công tháng" className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {cells.map((c, i) => {
          if (!c) return <span key={`e${i}`} aria-hidden="true" />;
          const meta = c.record ? ATTENDANCE_STATUS[c.record.status] : null;
          const isSel = selected === c.key;
          const label = meta ? meta.label : c.weekend ? "Nghỉ cuối tuần" : c.future ? "Chưa tới" : "Chưa ghi nhận";
          return (
            <button
              key={c.key}
              type="button"
              role="gridcell"
              aria-selected={isSel}
              aria-label={`Ngày ${c.day}: ${label}`}
              aria-current={c.today ? "date" : undefined}
              onClick={() => onSelect(c.key)}
              className={cn(
                "group/day relative flex aspect-square min-w-0 flex-col items-center justify-center gap-1 rounded-lg border text-center outline-none sm:aspect-auto sm:h-[76px] sm:items-start sm:justify-between sm:p-2 sm:text-left",
                "transition-[border-color,background-color,color] duration-300 focus-visible:ring-2 focus-visible:ring-ring",
                c.weekend || c.future ? "border-transparent bg-muted/30 text-muted-foreground" : "border-border/70 bg-card hover:border-foreground/25",
                isSel && "text-background hover:border-transparent",
              )}
            >
              {isSel && (
                <motion.span
                  layoutId={layoutKey}
                  aria-hidden="true"
                  className="absolute inset-[-1px] rounded-lg bg-foreground shadow-[0_8px_20px_-10px_rgb(0_0_0/0.5)]"
                  transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.8 }}
                />
              )}
              <span className="relative z-10 flex w-full items-center justify-center gap-1 sm:justify-between">
                <span
                  className={cn(
                    "text-[13px] leading-none font-semibold tabular-nums sm:text-[13.5px]",
                    c.today && !isSel && "flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground sm:size-[22px]",
                  )}
                >
                  {c.day}
                </span>
                {meta && <span className={cn("size-1.5 rounded-full max-sm:hidden", meta.dot, isSel && "ring-2 ring-foreground")} aria-hidden="true" />}
              </span>
              {meta ? (
                <>
                  <span className={cn("relative z-10 size-1.5 rounded-full sm:hidden", meta.dot)} aria-hidden="true" />
                  <span className="relative z-10 hidden w-full space-y-0.5 sm:block">
                    {c.record.check_in ? (
                      <span className={cn("block text-[11px] leading-tight tabular-nums", isSel ? "text-background/80" : "text-muted-foreground")}>
                        {c.record.check_in}–{c.record.check_out}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "block truncate rounded px-1 py-px text-[10.5px] leading-tight font-medium max-lg:hidden",
                        isSel ? "bg-background/15 text-background" : meta.chip,
                      )}
                    >
                      {meta.label}
                    </span>
                  </span>
                </>
              ) : (
                <span className={cn("relative z-10 hidden text-[10.5px] leading-tight sm:block", isSel ? "text-background/70" : "text-muted-foreground/70")}>
                  {c.weekend ? "Nghỉ tuần" : c.future ? "" : "—"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Chú thích màu — luôn có, vì ô lịch trên màn hẹp chỉ hiện chấm màu. */
export function StatusLegend({ count, className }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground", className)}>
      {STATUS_ORDER.map((s) => {
        const meta = ATTENDANCE_STATUS[s];
        return (
          <li key={s} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", meta.dot)} aria-hidden="true" />
            {meta.label}
            {count && <span className="font-medium text-foreground tabular-nums">{count[s]}</span>}
          </li>
        );
      })}
      <li className="flex items-center gap-1.5">
        <CalendarOff className="size-3" aria-hidden="true" />
        Cuối tuần
      </li>
    </ul>
  );
}
