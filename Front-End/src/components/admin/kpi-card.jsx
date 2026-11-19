import { TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Thay đổi % so với kỳ trước, hiển thị dạng Badge (số tĩnh). */
export function TrendBadge({ value }) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <Badge variant="outline" className={cn("gap-1 tabular-nums", up ? "text-success" : "text-destructive")}>
      <Icon />
      {up ? "+" : ""}
      {value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%
    </Badge>
  );
}

/**
 * Thẻ chỉ số kiểu shadcn "section-cards": nhãn nhỏ · giá trị lớn · chú thích ở chân thẻ.
 * Hover: nổi nhẹ (chỉ CSS, không có hiệu ứng nhảy số).
 */
export function KpiCard({ label, value, icon: Icon, action, footer, hint, children, className }) {
  return (
    <Card
      className={cn(
        "@container/card h-full gap-4 bg-gradient-to-b from-primary/[0.035] to-card py-5 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-md dark:from-primary/[0.06]",
        className,
      )}
    >
      <CardHeader className="px-5">
        <CardDescription className="flex items-center gap-1.5">
          {Icon && <Icon className="size-3.5" aria-hidden="true" />}
          {label}
        </CardDescription>
        <CardTitle className="font-display text-[26px] font-semibold tracking-[-0.03em] tabular-nums @[250px]/card:text-[30px]">
          {value}
        </CardTitle>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      {children && <div className="px-5">{children}</div>}
      {(footer || hint) && (
        <CardFooter className="flex-col items-start gap-1 px-5 text-[13px]">
          {footer && <div className="flex items-center gap-1.5 font-medium text-foreground">{footer}</div>}
          {hint && <div className="text-muted-foreground">{hint}</div>}
        </CardFooter>
      )}
    </Card>
  );
}
