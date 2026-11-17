import { Mail } from "lucide-react";
import { EmployeeStatusBadge, EmptyState, ErrorState, LoadingBlock, PageHeader, PersonAvatar } from "@/components/app/shared";
import { useEmployeeDashboard } from "@/hooks/use-employee-dashboard";
import { formatDate } from "@/lib/format";

export default function EmployeeTeam() {
  const { data, isPending, error, refetch } = useEmployeeDashboard();
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isPending) return <LoadingBlock rows={3} />;

  const me = data.user_info;
  const team = data.team_members ?? [];

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Đội ngũ" title={`Phòng ${me.department}`} description={`${team.length} thành viên cùng phòng ban.`} />
      {team.length === 0 ? (
        <EmptyState title="Chưa có đồng nghiệp" />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {team.map((m) => {
            const isMe = m.id === me.id;
            return (
              <li key={m.id} className={isMe ? "rounded-lg bg-surface-card p-6" : "rounded-lg border border-hairline p-6"}>
                <div className="flex items-start gap-4">
                  <PersonAvatar name={m.full_name} seed={m.employee_code} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate font-medium text-ink">
                      {m.full_name} {isMe && <span className="text-[13px] font-normal text-muted-foreground">(bạn)</span>}
                    </p>
                    <p className="truncate text-[14px] text-muted-foreground">{m.position}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                  <EmployeeStatusBadge status={m.status} />
                  <span className="tabular text-[13px] text-muted-foreground">Từ {formatDate(m.joined_at)}</span>
                </div>
                <a href={`mailto:${m.email}`} className="mt-4 flex items-center gap-2 truncate text-[14px] text-primary hover:underline">
                  <Mail className="size-4 shrink-0" /> {m.email}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
