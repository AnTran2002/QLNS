import { cn } from "@/lib/utils";

/**
 * Thanh tiến độ tĩnh (shadcn Progress không cần Radix). Độ rộng chuyển mượt bằng CSS
 * khi giá trị đổi — không có hiệu ứng nhảy số.
 */
function Meter({ value = 0, className, indicatorClassName, label }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn("grow-x h-full rounded-full bg-primary transition-[width] duration-700 ease-[cubic-bezier(.22,1,.36,1)]", indicatorClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export { Meter };
