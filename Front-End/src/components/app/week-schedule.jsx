import { motion } from "motion/react";
import { SPRING } from "@/components/app/motion";
import { WEEKDAYS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Lịch 7 ngày theo `work_schedule` của API; hôm nay nổi bật bằng màu nhấn. */
export function WeekSchedule({ schedule = {}, className, onTile = false }) {
  const todayIndex = (new Date().getDay() + 6) % 7; // 0 = Thứ Hai
  return (
    <ul className={cn("grid grid-cols-7 gap-1.5", className)}>
      {WEEKDAYS.map((d, i) => {
        const value = schedule[d.key] ?? "—";
        const off = !/\d/.test(value);
        const today = i === todayIndex;
        const [start, end] = off ? [] : value.split(/\s*-\s*/);
        return (
          <motion.li
            key={d.key}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...SPRING, delay: i * 0.04 }}
            whileHover={{ y: -3 }}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3.5 text-center",
              today
                ? "bg-primary text-primary-foreground"
                : onTile
                  ? off ? "bg-white/5 text-tile-muted" : "bg-white/10 text-tile-foreground"
                  : off ? "bg-muted/60 text-muted-foreground" : "bg-muted text-foreground",
            )}
            title={`${d.label}: ${value}`}
            aria-current={today ? "date" : undefined}
          >
            <span className="text-[13px] font-semibold">{d.short}</span>
            {off ? (
              <span className="text-[11px] leading-tight opacity-70">Nghỉ</span>
            ) : (
              <span className="tabular text-[11px] leading-tight opacity-80">
                {start}
                <br />
                {end}
              </span>
            )}
          </motion.li>
        );
      })}
    </ul>
  );
}
