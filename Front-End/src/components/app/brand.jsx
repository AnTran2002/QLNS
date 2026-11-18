import { cn } from "@/lib/utils";

/** Biểu tượng QLNS: vòng tròn + chấm (chữ Q tối giản), đơn sắc theo màu chữ hiện tại. */
export function BrandMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-7 shrink-0", className)}>
      <rect width="32" height="32" rx="9" className="fill-foreground" />
      <circle cx="15" cy="15" r="6.5" fill="none" strokeWidth="2.6" className="stroke-background" />
      <circle cx="22.5" cy="22.5" r="2.6" className="fill-background" />
    </svg>
  );
}

export function Brand({ className, label = "QLNS" }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BrandMark />
      <span className="font-display text-[17px] font-semibold tracking-[-0.02em]">{label}</span>
    </span>
  );
}
