import { AlertCircle, Inbox, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PERIOD_STATUS } from "@/lib/constants";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Tiêu đề trang: eyebrow + serif display + mô tả + vùng hành động */
export function PageHeader({ eyebrow, title, description, actions, className }) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-2xl space-y-2">
        {eyebrow && <p className="caption-upper text-primary">{eyebrow}</p>}
        <h1 className="display-md">{title}</h1>
        {description && <p className="text-[15px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Ô số liệu kiểu feature-card (nền cream card, không shadow) */
export function StatCard({ label, value, hint, icon: Icon, className }) {
  return (
    <div className={cn("rounded-lg bg-surface-card p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        {Icon && <Icon className="size-4 text-muted-soft" aria-hidden="true" />}
      </div>
      <p className="tabular mt-3 font-serif text-[30px] leading-none tracking-[-0.5px] text-ink">{value}</p>
      {hint && <p className="mt-2 text-[13px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const STATUS_TONE = {
  "Đang làm việc": "bg-success/12 text-[#2f7a41]",
  "Thử việc": "bg-amber/18 text-[#9a5b14]",
  "Nghỉ phép": "bg-surface-cream text-body",
};

export function EmployeeStatusBadge({ status }) {
  return (
    <Badge variant="secondary" className={cn("gap-1.5 rounded-full", STATUS_TONE[status])}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {status || "Chưa rõ"}
    </Badge>
  );
}

const PERIOD_TONE = {
  amber: "bg-amber/18 text-[#9a5b14]",
  ink: "bg-surface-dark text-on-dark",
  success: "bg-success/12 text-[#2f7a41]",
};

export function PeriodStatusBadge({ status }) {
  const meta = PERIOD_STATUS[status] ?? { label: status, tone: "ink" };
  return (
    <Badge variant="secondary" className={cn("rounded-full", PERIOD_TONE[meta.tone])}>
      {meta.label}
    </Badge>
  );
}

const AVATAR_TONES = ["bg-[#efe9de] text-[#6b4a3a]", "bg-[#f3dfd5] text-[#8a3f27]", "bg-[#dfece8] text-[#2c6a5d]", "bg-[#f4e6d1] text-[#8a5a1c]", "bg-[#e8e0d2] text-[#3d3d3a]"];

export function PersonAvatar({ name, seed, size = "md", className }) {
  const key = String(seed ?? name ?? "");
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium",
        size === "sm" && "size-8 text-[12px]",
        size === "md" && "size-10 text-[13px]",
        size === "lg" && "size-14 text-[17px]",
        AVATAR_TONES[hash % AVATAR_TONES.length],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function EmptyState({ title = "Chưa có dữ liệu", description, action, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-hairline px-6 py-12 text-center", className)}>
      <Inbox className="size-6 text-muted-soft" aria-hidden="true" />
      <p className="font-medium text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }) {
  return (
    <div role="alert" className={cn("flex flex-col items-start gap-3 rounded-lg border border-destructive/25 bg-destructive/5 p-5", className)}>
      <div className="flex items-center gap-2 font-medium text-destructive">
        <AlertCircle className="size-4" aria-hidden="true" />
        Không tải được dữ liệu
      </div>
      <p className="text-sm text-body">{error?.message || "Đã có lỗi xảy ra."}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={() => onRetry()}>
          <RotateCw /> Thử lại
        </Button>
      )}
    </div>
  );
}

export function LoadingBlock({ rows = 3, className }) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true" aria-label="Đang tải">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg bg-surface-card" />
      ))}
    </div>
  );
}

/** Cặp nhãn – giá trị trong lưới thông tin */
export function InfoItem({ label, children, mono = false }) {
  return (
    <div className="space-y-1">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className={cn("text-[15px] text-ink", mono && "font-mono text-[14px]")}>{children ?? "Chưa cập nhật"}</dd>
    </div>
  );
}
