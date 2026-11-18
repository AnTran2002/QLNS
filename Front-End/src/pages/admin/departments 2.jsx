import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { EmptyState, ErrorState, LoadingBlock, PageHeader, PersonAvatar } from "@/components/app/shared";
import { api } from "@/lib/api";
import { EMPLOYEE_STATUSES } from "@/lib/constants";
import { groupByDepartment } from "@/lib/hr";
import { formatMoneyShort } from "@/lib/format";

export default function DepartmentsPage() {
  const { data: employees = [], isPending, error, refetch } = useQuery({ queryKey: ["employees"], queryFn: api.employees });
  const groups = useMemo(() => groupByDepartment(employees), [employees]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Tổ chức"
        title="Phòng ban"
        description="Tổng hợp từ cột department của bảng users: quy mô, trạng thái và quỹ lương hợp đồng mỗi phòng."
      />
      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isPending ? (
        <LoadingBlock rows={3} />
      ) : groups.length === 0 ? (
        <EmptyState title="Chưa có phòng ban" description="Phòng ban được tạo khi bạn thêm nhân viên." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <article key={g.name} className="flex flex-col gap-5 rounded-lg bg-surface-card p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="display-sm">{g.name}</h2>
                  <p className="mt-1 text-[14px] text-muted-foreground">{g.members.length} thành viên</p>
                </div>
                <p className="tabular rounded-full bg-canvas px-3 py-1 text-[13px] font-medium text-ink">
                  {formatMoneyShort(g.payroll)}/tháng
                </p>
              </div>

              <div className="flex h-1.5 overflow-hidden rounded-full bg-canvas" aria-hidden="true">
                <span className="bg-success" style={{ width: `${(g.byStatus["Đang làm việc"] / g.members.length) * 100}%` }} />
                <span className="bg-amber" style={{ width: `${(g.byStatus["Thử việc"] / g.members.length) * 100}%` }} />
                <span className="bg-muted-soft" style={{ width: `${(g.byStatus["Nghỉ phép"] / g.members.length) * 100}%` }} />
              </div>
              <p className="-mt-2 text-[13px] text-body">
                {EMPLOYEE_STATUSES.map((s) => `${g.byStatus[s]} ${s.toLowerCase()}`).join(" · ")}
              </p>

              <ul className="space-y-3">
                {g.members.map((m) => (
                  <li key={m.id} className="flex items-center gap-3">
                    <PersonAvatar name={m.full_name} seed={m.employee_code} size="sm" className="bg-canvas" />
                    <span className="grid min-w-0">
                      <span className="truncate text-[14px] font-medium text-ink">{m.full_name}</span>
                      <span className="truncate text-[13px] text-muted-foreground">{m.position}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
      <Link to="/admin/nhan-vien" className="inline-flex items-center gap-1 text-[14px] text-primary hover:underline">
        Quản lý hồ sơ nhân viên <ArrowUpRight className="size-4" />
      </Link>
    </div>
  );
}
