import { WEEKDAYS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Ca làm theo `work_schedule` của API; hôm nay nổi bật bằng viền & nền màu nhấn. */
export function WeekSchedule({ schedule = {}, className }) {
  const todayIndex = (new Date().getDay() + 6) % 7; // 0 = Thứ Hai
  return (
    <ul className={cn("grid grid-cols-7 gap-1.5", className)}>
      {WEEKDAYS.map((d, i) => {
        const value = schedule[d.key] ?? "—";
        const off = !/\d/.test(value);
        const today = i === todayIndex;
        const [start, end] = off ? [] : value.split(/\s*-\s*/);
        return (
          <li
            key={d.key}
            title={`${d.label}: ${value}`}
            aria-current={today ? "date" : undefined}
            className={cn(
              "relative flex flex-col items-center gap-1 rounded-xl border px-1 py-3 text-center transition-[transform,background-color] duration-200 hover:-translate-y-0.5",
              today
                ? "border-primary/40 bg-primary/[0.07] text-foreground"
                : off
                  ? "border-dashed border-border bg-transparent text-muted-foreground"
                  : "border-border/80 bg-muted/40 text-foreground",
            )}
          >
            <span className={cn("text-[12.5px] font-semibold", today && "text-primary")}>{d.short}</span>
            {off ? (
              <span className="text-[11px] leading-tight">Nghỉ</span>
            ) : (
              <span className="text-[11px] leading-tight text-muted-foreground tabular-nums">
                {start}
                <br />
                {end}
              </span>
            )}
            {today && <span className="absolute -top-1 size-2 rounded-full bg-primary ring-2 ring-card" aria-hidden="true" />}
          </li>
        );
      })}
    </ul>
  );
}

/** Ca làm hôm nay — { label, value, off } */
export function todayShift(schedule = {}) {
  const d = WEEKDAYS[(new Date().getDay() + 6) % 7];
  const value = schedule[d.key] ?? "—";
  return { label: d.label, value, off: !/\d/.test(value) };
}
