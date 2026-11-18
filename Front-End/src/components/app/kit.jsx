import { AlertCircle, RotateCw, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/animate-ui/components/animate/tabs";
import { ShimmeringText } from "@/components/animate-ui/primitives/texts/shimmering";
import { Skeleton } from "@/components/ui/skeleton";
import { BlurIn, Reveal, SPRING } from "@/components/app/motion";
import { PERIOD_STATUS } from "@/lib/constants";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Tiêu đề trang                                                       */
/* ------------------------------------------------------------------ */

/** Eyebrow + tiêu đề lớn (Apple tight) + mô tả + hành động bên phải. */
export function PageHeader({ eyebrow, title, description, actions, className }) {
  return (
    <header className={cn("flex flex-col gap-6 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-2xl space-y-3">
        {eyebrow && (
          <Reveal offset={10}>
            <p className="text-eyebrow">{eyebrow}</p>
          </Reveal>
        )}
        <BlurIn delay={60}>
          <h1 className="text-display">{title}</h1>
        </BlurIn>
        {description && (
          <Reveal delay={140} offset={12}>
            <p className="text-lead max-w-xl">{description}</p>
          </Reveal>
        )}
      </div>
      {actions && (
        <Reveal delay={200} offset={12}>
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        </Reveal>
      )}
    </header>
  );
}

/** Tiêu đề khối nội dung + liên kết phụ. */
export function SectionTitle({ children, action, className }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", className)}>
      <h2 className="text-title">{children}</h2>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ô số liệu                                                           */
/* ------------------------------------------------------------------ */

export function StatTile({ label, value, hint, icon: Icon, className }) {
  return (
    <div className={cn("card card-hover flex h-full flex-col justify-between gap-5 p-4 sm:p-5 md:p-6", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] leading-snug font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span className="flex size-8 items-center justify-center rounded-full bg-muted text-foreground/70">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        <p className="font-display text-[26px] leading-none font-semibold tracking-[-0.03em] text-foreground sm:text-[32px] md:text-[36px]">{value}</p>
        {hint && <p className="text-[13px] text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trạng thái                                                          */
/* ------------------------------------------------------------------ */

const STATUS_DOT = {
  "Đang làm việc": "bg-success",
  "Thử việc": "bg-warning",
  "Nghỉ phép": "bg-muted-foreground",
};

export function EmployeeStatusBadge({ status, className }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[12px] font-medium text-foreground/85", className)}>
      <span className={cn("size-1.5 rounded-full", STATUS_DOT[status] ?? "bg-muted-foreground")} aria-hidden="true" />
      {status || "Chưa rõ"}
    </span>
  );
}

const PERIOD_TONE = {
  amber: "bg-warning/12 text-warning",
  ink: "bg-foreground text-background",
  success: "bg-success/12 text-success",
};

export function PeriodStatusBadge({ status, onTile = false, className }) {
  const meta = PERIOD_STATUS[status] ?? { label: status, tone: "ink" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium",
        onTile ? "bg-white/12 text-white" : PERIOD_TONE[meta.tone],
        className,
      )}
    >
      {meta.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */

const AVATAR_HUES = [211, 262, 330, 24, 145, 190, 45];

export function PersonAvatar({ name, seed, size = "md", className }) {
  const key = String(seed ?? name ?? "");
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = AVATAR_HUES[hash % AVATAR_HUES.length];
  return (
    <span
      aria-hidden="true"
      style={{ "--h": hue }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-[-0.01em] select-none",
        "bg-[hsl(var(--h)_40%_92%)] text-[hsl(var(--h)_45%_32%)] dark:bg-[hsl(var(--h)_20%_22%)] dark:text-[hsl(var(--h)_60%_82%)]",
        size === "xs" && "size-7 text-[11px]",
        size === "sm" && "size-9 text-[12px]",
        size === "md" && "size-11 text-[14px]",
        size === "lg" && "size-16 text-[20px]",
        size === "xl" && "size-24 text-[30px]",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Nội dung chi tiết                                                   */
/* ------------------------------------------------------------------ */

export function InfoItem({ label, children, mono = false, className }) {
  return (
    <div className={cn("space-y-1", className)}>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className={cn("text-[16px] text-foreground", mono && "font-mono text-[15px]")}>{children ?? "Chưa cập nhật"}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Điều khiển                                                          */
/* ------------------------------------------------------------------ */

/** Segmented control kiểu iOS — nền trượt mượt giữa các lựa chọn (Animate UI Tabs). */
export function Segmented({ value, onValueChange, options, className, label }) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className={cn("w-full sm:w-auto", className)}>
      <TabsList aria-label={label} className="w-full sm:w-auto">
        {options.map((o) => (
          <TabsTrigger key={o.value} value={o.value} aria-selected={value === o.value}>
            {o.label}
            {o.count !== undefined && <span className="tabular text-muted-foreground">{o.count}</span>}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/** Ô tìm kiếm dạng pill (search-input). */
export function SearchField({ value, onChange, placeholder, label, className }) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-10 w-full rounded-full border border-input bg-card pr-10 pl-10 text-[15px] text-foreground transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-muted-foreground/80 hover:border-foreground/20 focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15 [&::-webkit-search-cancel-button]:appearance-none"
      />
      <AnimatePresence>
        {value && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={SPRING}
            onClick={() => onChange("")}
            aria-label="Xoá từ khoá"
            className="absolute top-1/2 right-2.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-muted-foreground/25 text-foreground/70 hover:bg-muted-foreground/40"
          >
            <X className="size-3.5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Thông báo lỗi trong biểu mẫu — trượt mở mượt. */
export function FormError({ message }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.p
          role="alert"
          initial={{ opacity: 0, height: 0, y: -4 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: -4 }}
          transition={SPRING}
          className="overflow-hidden"
        >
          <span className="flex items-start gap-2 rounded-xl bg-destructive/8 px-4 py-3 text-[14px] text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {message}
          </span>
        </motion.p>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Trạng thái rỗng / lỗi / đang tải                                    */
/* ------------------------------------------------------------------ */

export function EmptyState({ title = "Chưa có dữ liệu", description, action, icon: Icon, className }) {
  return (
    <Reveal>
      <div className={cn("card flex flex-col items-center justify-center gap-2 px-6 py-16 text-center", className)}>
        {Icon && (
          <span className="mb-2 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icon className="size-5" aria-hidden="true" />
          </span>
        )}
        <p className="text-[17px] font-semibold text-foreground">{title}</p>
        {description && <p className="max-w-sm text-[15px] text-muted-foreground">{description}</p>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </Reveal>
  );
}

export function ErrorState({ error, onRetry, className }) {
  return (
    <Reveal>
      <div role="alert" className={cn("card flex flex-col items-start gap-3 p-6", className)}>
        <span className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="size-5" aria-hidden="true" />
        </span>
        <p className="text-[17px] font-semibold text-foreground">Không tải được dữ liệu</p>
        <p className="text-[15px] text-muted-foreground">{error?.message || "Đã có lỗi xảy ra."}</p>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={() => onRetry()}>
            <RotateCw /> Thử lại
          </Button>
        )}
      </div>
    </Reveal>
  );
}

export function LoadingState({ rows = 3, label = "Đang tải dữ liệu", className }) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true" aria-label={label}>
      <ShimmeringText
        text={`${label}…`}
        className="text-[13px]"
        color="var(--color-muted-foreground)"
        shimmeringColor="var(--color-foreground)"
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: Math.min(rows, 4) }, (_, i) => (
          <Skeleton key={`s${i}`} className="h-32 rounded-[22px]" />
        ))}
      </div>
      {Array.from({ length: Math.max(rows - 2, 1) }, (_, i) => (
        <Skeleton key={`r${i}`} className="h-16 rounded-[22px]" />
      ))}
    </div>
  );
}
