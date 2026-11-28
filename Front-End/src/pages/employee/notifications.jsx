import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { Bell, CalendarClock, CheckCheck, CircleDollarSign, Plane, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { EmptyState, ErrorState, LoadingState, Segmented } from "@/components/app/kit";
import { Reveal } from "@/components/app/motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

const icons = {
  OT_ADJUSTMENT: ReceiptText,
  PAYROLL_PUBLISHED: CircleDollarSign,
  LEAVE_REVIEW: Plane,
  SALARY_ADJUSTMENT: CalendarClock,
};

export default function EmployeeNotifications() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const query = useQuery({
    queryKey: ["employee-notifications", filter],
    queryFn: () => api.notifications(filter === "unread"),
  });
  const markMutation = useMutation({
    mutationFn: (id) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-notifications"] });
    },
    onError: (err) => toast.error(err.message),
  });

  if (query.error) return <ErrorState error={query.error} onRetry={query.refetch} />;
  if (query.isPending) return <LoadingState rows={4} />;

  const notifications = query.data?.notifications ?? [];
  const unreadCount = query.data?.unread_count ?? 0;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Reveal offset={8}>
          <h1 className="page-title">Thông báo</h1>
          <p className="text-[14px] text-muted-foreground">Theo dõi điều chỉnh OT, kết quả nghỉ phép và thông tin lương.</p>
        </Reveal>
      </header>

      <Reveal delay={80} offset={14}>
        <Card className="gap-0 py-0">
          <CardHeader className="border-b border-border/70 px-4 py-4 sm:px-5 [.border-b]:pb-4">
            <CardTitle>Danh sách thông báo</CardTitle>
            <CardDescription>{unreadCount ? `${unreadCount} thông báo chưa đọc` : "Không có thông báo chưa đọc"}</CardDescription>
            <CardAction className="max-md:col-span-2 max-md:col-start-1 max-md:row-start-3 max-md:mt-3 max-md:justify-self-stretch">
              <Segmented
                value={filter}
                onValueChange={setFilter}
                label="Lọc thông báo"
                options={[
                  { value: "all", label: "Tất cả", count: notifications.length },
                  { value: "unread", label: "Chưa đọc", count: unreadCount },
                ]}
              />
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            {unreadCount > 0 && (
              <div className="flex justify-end border-b border-border/60 px-4 py-2 sm:px-5">
                <Button variant="ghost" size="sm" onClick={() => markMutation.mutate(null)} disabled={markMutation.isPending}>
                  <CheckCheck /> Đánh dấu tất cả đã đọc
                </Button>
              </div>
            )}
            {notifications.length === 0 ? (
              <EmptyState icon={Bell} title="Chưa có thông báo" description="Thông báo mới sẽ xuất hiện tại đây." />
            ) : (
              <ul className="divide-y divide-border/60">
                {notifications.map((item) => {
                  const Icon = icons[item.type] ?? Bell;
                  const unread = item.read_at === null;
                  return (
                    <li key={item.id} className={unread ? "bg-primary/[0.035]" : ""}>
                      <div className="flex gap-3 px-4 py-4 sm:px-5">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{item.title}</p>
                              <p className="mt-1 text-[13px] leading-5 text-muted-foreground">{item.message}</p>
                            </div>
                            {unread && <Badge variant="success">Mới</Badge>}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
                            <time dateTime={item.created_at}>{new Date(String(item.created_at).replace(" ", "T")).toLocaleString("vi-VN")}</time>
                            {item.link && (
                              <Link
                                to={item.link}
                                onClick={() => unread && markMutation.mutate(item.id)}
                                className="font-medium text-link"
                              >
                                Xem chi tiết
                              </Link>
                            )}
                            {unread && !item.link && (
                              <button
                                type="button"
                                onClick={() => markMutation.mutate(item.id)}
                                className="font-medium text-link"
                              >
                                Đánh dấu đã đọc
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
