import { Mail, UsersRound } from "lucide-react";
import { EmployeeStatusBadge, EmptyState, ErrorState, LoadingState, PageHeader, PersonAvatar } from "@/components/app/kit";
import { RevealGroup } from "@/components/app/motion";
import { useEmployeeDashboard } from "@/hooks/use-employee-dashboard";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function EmployeeTeam() {
  const { data, isPending, error, refetch } = useEmployeeDashboard();
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isPending) return <LoadingState rows={3} />;

  const me = data.user_info;
  const team = data.team_members ?? [];

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Đội ngũ" title={`Phòng ${me.department}`} description={`${team.length} thành viên cùng phòng ban.`} />
      {team.length === 0 ? (
        <EmptyState icon={UsersRound} title="Chưa có đồng nghiệp" />
      ) : (
        <div role="list" className="grid gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-3">
          <RevealGroup step={60} delay={120} itemClassName="h-full">
            {team.map((m) => {
              const isMe = m.id === me.id;
              return (
                <article role="listitem" key={m.id} className={cn("card card-hover flex h-full flex-col items-center p-7 text-center", isMe && "ring-2 ring-primary/60")}>
                  <PersonAvatar name={m.full_name} seed={m.employee_code} size="lg" />
                  <p className="mt-4 text-[17px] font-semibold text-foreground">
                    {m.full_name}
                    {isMe && <span className="ml-1.5 text-[13px] font-normal text-muted-foreground">(bạn)</span>}
                  </p>
                  <p className="mt-0.5 text-[14px] text-muted-foreground">{m.position}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <EmployeeStatusBadge status={m.status} />
                    <span className="tabular text-[12px] text-muted-foreground">Từ {formatDate(m.joined_at)}</span>
                  </div>
                  <a
                    href={`mailto:${m.email}`}
                    className="mt-5 inline-flex max-w-full items-center gap-2 truncate rounded-full bg-muted px-4 py-2 text-[13px] text-link transition-colors hover:bg-accent"
                  >
                    <Mail className="size-4 shrink-0" /> <span className="truncate">{m.email}</span>
                  </a>
                </article>
              );
            })}
          </RevealGroup>
        </div>
      )}
    </div>
  );
}
