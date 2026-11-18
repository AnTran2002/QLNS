import { WEEKDAYS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Lịch 7 ngày theo `work_schedule` của API; tô coral ngày hôm nay. */
export function WeekSchedule({ schedule = {}, className }) {
  const todayIndex = (new Date().getDay() + 6) % 7; // 0 = Thứ Hai
  return (
    <ul className={cn("grid grid-cols-7 gap-1.5", className)}>
      {WEEKDAYS.map((d, i) => {
        const value = schedule[d.key] ?? "—";
        const off = !/\d/.test(value);
        const today = i === todayIndex;
        return (
          <li
            key={d.key}
            className={cn(
              "flex flex-col items-center gap-2 rounded-md px-1 py-3 text-center",
              today ? "bg-primary text-white" : off ? "bg-canvas text-muted-soft" : "bg-canvas text-ink",
            )}
            title={`${d.label}: ${value}`}
          >
            <span className="text-[12px] font-medium">{d.short}</span>
            <span className={cn("text-[11px] leading-tight", today ? "text-white/85" : "text-muted-foreground")}>
              {off ? "Nghỉ" : value.replace(" - ", "–")}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
