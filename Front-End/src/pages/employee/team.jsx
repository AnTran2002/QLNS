import { useMemo, useState } from "react";
import { Mail, UsersRound } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import {
  EmployeeStatusBadge,
  EmptyState,
  ErrorState,
  LoadingState,
  PersonAvatar,
  SearchField,
  Segmented,
} from "@/components/app/kit";
import { Reveal } from "@/components/app/motion";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useEmployeeDashboard } from "@/hooks/use-employee-dashboard";
import { useMeta } from "@/hooks/use-meta";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const fold = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

export default function EmployeeTeam() {
  const { data, isPending, error, refetch } = useEmployeeDashboard();
  const { employeeStatuses } = useMeta();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const team = useMemo(() => data?.team_members ?? [], [data]);
  const shown = useMemo(() => {
    const q = fold(query.trim());
    return team.filter(
      (m) =>
        (status === "all" || m.status === status) &&
        (!q ||
          [m.full_name, m.position, m.employee_code, m.email].some((v) =>
            fold(v).includes(q),
          )),
    );
  }, [team, query, status]);

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isPending) return <LoadingState rows={3} />;

  const me = data.user_info;
  const statusOptions = [
    { value: "all", label: "Tất cả", count: team.length },
    ...employeeStatuses.map((s) => ({
      value: s,
      label: s,
      count: team.filter((m) => m.status === s).length,
    })).filter((o) => o.count > 0),
  ];

  return (
    <div className="space-y-6">
      <header>
        <Reveal offset={8}>
          <h1 className="page-title">
            Phòng {me.department}
          </h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            {team.length} thành viên cùng phòng ban.
          </p>
        </Reveal>
      </header>

      {team.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="Chưa có đồng nghiệp"
          description="Phòng ban của bạn chưa có thành viên nào khác."
        />
      ) : (
        <>
          <Reveal delay={60} offset={10}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SearchField
                value={query}
                onChange={setQuery}
                placeholder="Tìm theo tên, chức danh, mã…"
                label="Tìm đồng nghiệp"
                className="sm:w-72"
              />
              <Segmented
                value={status}
                onValueChange={setStatus}
                options={statusOptions}
                label="Lọc theo trạng thái"
              />
            </div>
          </Reveal>

          {shown.length === 0 ? (
            <Card className="items-center py-12 text-center text-[13px] text-muted-foreground">
              Không tìm thấy đồng nghiệp phù hợp.
            </Card>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((m, i) => {
                const isMe = m.id === me.id;
                return (
                  <li key={m.id} className="h-full">
                    <Reveal
                      delay={100 + Math.min(i, 8) * 40}
                      offset={10}
                      className="h-full"
                    >
                      <Card
                        className={cn(
                          "h-full gap-0 py-0",
                          isMe && "border-primary/50 ring-1 ring-primary/30",
                        )}
                      >
                        <CardContent className="flex items-start gap-3 p-4">
                          <PersonAvatar
                            name={m.full_name}
                            seed={m.employee_code}
                            src={m.avatar}
                            size="md"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14.5px] font-semibold">
                              {m.full_name}
                              {isMe && (
                                <span className="ml-1.5 text-[12.5px] font-normal text-muted-foreground">
                                  (bạn)
                                </span>
                              )}
                            </p>
                            <p className="truncate text-[13px] text-muted-foreground">
                              {m.position || "Chưa cập nhật chức danh"}
                            </p>
                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                              <EmployeeStatusBadge status={m.status} />
                              <span className="text-[12px] text-muted-foreground tabular-nums">
                                Từ {formatDate(m.joined_at)}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="mt-auto border-t border-border/70 px-4 py-2.5 [.border-t]:pt-2.5">
                          <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-muted-foreground">
                            {m.employee_code}
                          </span>
                          {m.email && !isMe && (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="-mr-2"
                            >
                              <a
                                href={`mailto:${m.email}`}
                                aria-label={`Gửi email cho ${m.full_name}`}
                              >
                                <Mail /> Email
                              </a>
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    </Reveal>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
