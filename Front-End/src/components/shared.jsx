import { ArrowDownLeft, ArrowUpRight, ChevronRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/data/workspace";
import { cn } from "@/lib/utils";
export function Avatar({ name, index = 0, small = false }) {
  return (
    <span
      className={cn(
        "person-avatar",
        small && "person-avatar-small",
        `avatar-tone-${index % 4}`,
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
export function Status({ status }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "status-badge",
        status === "Đang làm việc" && "status-active",
        status === "Thử việc" && "status-trial",
      )}
    >
      <span />
      {status}
    </Badge>
  );
}
export function Panel({ title, description, action, children, className }) {
  return (
    <section className={cn("panel", className)}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function StatCard({
  title,
  value,
  change,
  detail,
  icon,
  spark,
  dark = false,
}) {
  return (
    <div className={cn("stat-card", dark && "stat-dark")}>
      <div className="stat-top">
        <span>{title}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-middle">
        <strong>{value}</strong>
        <svg width="100" height="38" viewBox="0 0 100 38" aria-hidden="true">
          <polyline
            points={spark.map((y, i) => `${i * 10},${38 - y}`).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="stat-foot">
        <span className="stat-change">
          {change.startsWith("-") ? (
            <ArrowDownLeft size={12} />
          ) : (
            <ArrowUpRight size={12} />
          )}
          {change}
        </span>
        <span>{detail}</span>
      </div>
    </div>
  );
}
export function EmptyState({
  title = "Không tìm thấy kết quả",
  description = "Thử thay đổi từ khóa hoặc bộ lọc để xem thêm kết quả.",
  action,
}) {
  return (
    <div className="empty-state">
      <span>
        <Users size={24} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function ViewAll({ onClick, children = "Xem tất cả" }) {
  return (
    <Button variant="ghost" size="sm" className="view-all" onClick={onClick}>
      {children}
      <ChevronRight size={14} />
    </Button>
  );
}
