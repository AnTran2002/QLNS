import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { motion } from "motion/react";
import { Building2, ChevronRight } from "lucide-react";
import { AvatarGroup, AvatarGroupTooltip } from "@/components/animate-ui/components/animate/avatar-group";
import { EmptyState, ErrorState, LoadingState, PageHeader, PersonAvatar } from "@/components/app/kit";
import { Count, MoneyShort, Reveal, SPRING } from "@/components/app/motion";
import { api } from "@/lib/api";
import { EMPLOYEE_STATUSES } from "@/lib/constants";
import { groupByDepartment } from "@/lib/hr";

const STATUS_BAR = { "Đang làm việc": "bg-success", "Thử việc": "bg-warning", "Nghỉ phép": "bg-muted-foreground/50" };

export default function DepartmentsPage() {
  const { data: employees = [], isPending, error, refetch } = useQuery({ queryKey: ["employees"], queryFn: api.employees });
  const groups = useMemo(() => groupByDepartment(employees), [employees]);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Tổ chức"
        title="Phòng ban"
        description="Quy mô, trạng thái và quỹ lương hợp đồng của từng phòng — tổng hợp từ hồ sơ nhân viên."
        actions={
          <Link to="/admin/nhan-vien" className="group inline-flex items-center text-[15px] text-link">
            Quản lý hồ sơ nhân viên <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        }
      />
      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isPending ? (
        <LoadingState rows={3} />
      ) : groups.length === 0 ? (
        <EmptyState icon={Building2} title="Chưa có phòng ban" description="Phòng ban được tạo khi bạn thêm nhân viên." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:gap-4 xl:grid-cols-3">
          {groups.map((g, gi) => (
            <Reveal key={g.name} delay={Math.min(gi, 8) * 70} className="h-full">
              <article className="card card-hover flex h-full flex-col gap-6 p-6 md:p-7">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-title">{g.name}</h2>
                    <p className="mt-1 text-[14px] text-muted-foreground">
                      <Count value={g.members.length} /> thành viên
                    </p>
                  </div>
                  <p className="rounded-full bg-muted px-3 py-1 text-[13px] font-medium text-foreground">
                    <MoneyShort value={g.payroll} />
                    <span className="text-muted-foreground">/tháng</span>
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    {EMPLOYEE_STATUSES.map((s, i) => (
                      <motion.span
                        key={s}
                        className={STATUS_BAR[s]}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(g.byStatus[s] / g.members.length) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ ...SPRING, delay: 0.2 + i * 0.08 }}
                      />
                    ))}
                  </div>
                  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                    {EMPLOYEE_STATUSES.map((s) => (
                      <li key={s} className="flex items-center gap-1.5">
                        <span className={`size-1.5 rounded-full ${STATUS_BAR[s]}`} aria-hidden="true" />
                        <span className="tabular text-foreground">{g.byStatus[s]}</span> {s.toLowerCase()}
                      </li>
                    ))}
                  </ul>
                </div>

                <AvatarGroup className="h-10">
                  {g.members.slice(0, 8).map((m) => (
                    <span key={m.id} className="rounded-full ring-2 ring-card">
                      <PersonAvatar name={m.full_name} seed={m.employee_code} src={m.avatar} size="sm" />
                      <AvatarGroupTooltip>{m.full_name}</AvatarGroupTooltip>
                    </span>
                  ))}
                </AvatarGroup>

                <ul className="mt-auto divide-y divide-border/60 border-t border-border/60">
                  {g.members.map((m) => (
                    <li key={m.id}>
                      <Link
                        to={`/admin/nhan-vien?xem=${m.id}`}
                        className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/60"
                      >
                        <span className="grid min-w-0 flex-1">
                          <span className="truncate text-[14px] font-medium text-foreground">{m.full_name}</span>
                          <span className="truncate text-[13px] text-muted-foreground">{m.position}</span>
                        </span>
                        <ChevronRight className="size-4 text-muted-foreground/50" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
