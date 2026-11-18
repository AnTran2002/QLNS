import { cn } from "@/lib/utils";

/** Biểu tượng riêng của QLNS: hai người lồng nhau trong khối coral. */
export function BrandMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="8" fill="var(--claude-primary)" />
      <path d="M10 21.5c0-3 2.7-5 6-5s6 2 6 5" fill="none" stroke="var(--claude-canvas)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="16" cy="11.5" r="3.4" fill="var(--claude-canvas)" />
    </svg>
  );
}

export function Brand({ className, subtitle = "Quản trị nhân sự", tone = "light" }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      <div className="grid leading-tight">
        <span className={cn("font-serif text-[19px] tracking-[-0.3px]", tone === "dark" ? "text-on-dark" : "text-ink")}>
          QLNS
        </span>
        {subtitle && (
          <span className={cn("text-[12px]", tone === "dark" ? "text-on-dark-soft" : "text-muted-foreground")}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
