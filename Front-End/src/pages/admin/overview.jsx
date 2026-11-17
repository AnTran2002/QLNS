import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { ArrowRight, Briefcase, Calculator, Clock, Plus, UserCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState, EmployeeStatusBadge, LoadingBlock, PeriodStatusBadge, PersonAvatar, StatCard } from "@/components/app/shared";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { formatDate, formatMoney, formatMoneyShort, formatPeriod, givenName, greeting } from "@/lib/format";
import { groupByDepartment } from "@/lib/hr";

export default function AdminOverview() {
  const { user } = useAuth();
  const employeesQuery = useQuery({ queryKey: ["employees"], queryFn: api.employees });
  const periodsQuery = useQuery({ queryKey: ["payroll", "periods"], queryFn: api.payrollPeriods });
  const employees = employeesQuery.data ?? [];
  const periods = periodsQuery.data ?? [];
  const current = periods[0];
  const lastPaid = periods.find((p) => p.status === "PAID");

  const stats = useMemo(() => {
    const count = (s) => employees.filter((e) => e.status === s).length;
    return {
      total: employees.length,
      active: count("Đang làm việc"),
      probation: count("Thử việc"),
      leave: count("Nghỉ phép"),
      fund: employees.reduce((s, e) => s + e.base_salary + e.allowance, 0),
    };
  }, [employees]);
  const departments = useMemo(() => groupByDepartment(employees), [employees]);
  const recent = useMemo(
    () => [...employees].sort((a, b) => String(b.joined_at).localeCompare(String(a.joined_at))).slice(0, 5),
    [employees],
  );
  const maxDept = Math.max(1, ...departments.map((d) => d.members.length));

  return (
    <div className="space-y-10">
      {/* Hero — cream canvas, serif display */}
      <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <p className="caption-upper text-primary">Tổng quan quản trị</p>
          <h1 className="display-lg">{greeting()}, {givenName(user?.full_name)}.</h1>
          <p className="max-w-xl text-[16px] leading-relaxed text-muted-foreground">
            Tình hình nhân sự, hợp đồng và kỳ lương hiện tại — số liệu đọc trực tiếp từ database qlns.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild><Link to="/admin/bang-luong"><Calculator /> Tính lương</Link></Button>
          <Button asChild><Link to="/admin/nhan-vien?moi=1"><Plus /> Thêm nhân viên</Link></Button>
        </div>
      </section>

      {employeesQuery.error ? (
        <ErrorState error={employeesQuery.error} onRetry={employeesQuery.refetch} />
      ) : employeesQuery.isPending ? (
        <LoadingBlock rows={2} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Tổng nhân sự" value={stats.total} icon={Users} hint={`${departments.length} phòng ban`} />
          <StatCard label="Đang làm việc" value={stats.active} icon={UserCheck} hint={`${stats.leave} đang nghỉ phép`} />
          <StatCard label="Thử việc" value={stats.probation} icon={Clock} hint="Cần đánh giá chuyển chính thức" />
          <StatCard label="Quỹ lương hợp đồng" value={formatMoneyShort(stats.fund)} icon={Briefcase} hint="Lương cơ bản + phụ cấp / tháng" />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Kỳ lương — dark product surface */}
        <section className="flex flex-col justify-between gap-8 rounded-xl bg-surface-dark p-6 text-on-dark md:p-8">
          {periodsQuery.error ? (
            <p className="text-on-dark-soft">{periodsQuery.error.message}</p>
          ) : !current ? (
            <p className="text-on-dark-soft">{periodsQuery.isPending ? "Đang tải kỳ lương…" : "Chưa có kỳ lương nào."}</p>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <p className="caption-upper text-primary">Kỳ lương hiện tại</p>
                  <PeriodStatusBadge status={current.status} />
                </div>
                <p className="font-serif text-[44px] leading-none tracking-[-1px]">{formatPeriod(current.month_year)}</p>
                <p className="text-[14px] text-on-dark-soft">
                  {current.standard_days} ngày công chuẩn · đã tính {current.items_count}/{stats.total} nhân viên
                </p>
              </div>
              <div className="space-y-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-dark-elevated">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${stats.total ? (current.items_count / stats.total) * 100 : 0}%` }} />
                </div>
                <div className="flex flex-wrap items-end justify-between gap-4 pt-4">
                  {lastPaid ? (
                    <div>
                      <p className="text-[13px] text-on-dark-soft">Đã chi {formatPeriod(lastPaid.month_year)}</p>
                      <p className="tabular font-serif text-[26px] tracking-[-0.3px]">{formatMoney(lastPaid.total_net)}</p>
                    </div>
                  ) : <span />}
                  <Button variant="dark" asChild>
                    <Link to="/admin/bang-luong">Mở bảng lương <ArrowRight /></Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Phân bổ phòng ban */}
        <section className="rounded-xl border border-hairline p-6 md:p-8">
          <div className="flex items-baseline justify-between">
            <h2 className="display-sm">Phòng ban</h2>
            <Link to="/admin/phong-ban" className="text-[14px] text-primary hover:underline">Xem tất cả</Link>
          </div>
          <ul className="mt-6 space-y-4">
            {departments.map((d) => (
              <li key={d.name} className="space-y-1.5">
                <div className="flex justify-between text-[14px]">
                  <span className="text-ink">{d.name}</span>
                  <span className="tabular text-muted-foreground">{d.members.length}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-card">
                  <div className="h-full rounded-full bg-[#d9a28c]" style={{ width: `${(d.members.length / maxDept) * 100}%` }} />
                </div>
              </li>
            ))}
            {!departments.length && <li className="text-sm text-muted-foreground">Chưa có dữ liệu.</li>}
          </ul>
        </section>
      </div>

      {/* Nhân sự mới */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="display-sm">Gia nhập gần đây</h2>
          <Link to="/admin/nhan-vien" className="text-[14px] text-primary hover:underline">Danh sách nhân viên</Link>
        </div>
        <ul className="divide-y divide-hairline-soft rounded-lg border border-hairline">
          {recent.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-4 py-3.5">
              <PersonAvatar name={e.full_name} seed={e.employee_code} size="sm" />
              <span className="grid min-w-0 flex-1">
                <span className="truncate font-medium text-ink">{e.full_name}</span>
                <span className="truncate text-[13px] text-muted-foreground">{e.position} · {e.department}</span>
              </span>
              <span className="tabular hidden text-[13px] text-muted-foreground sm:block">{formatDate(e.joined_at)}</span>
              <EmployeeStatusBadge status={e.status} />
            </li>
          ))}
          {!recent.length && <li className="px-4 py-6 text-sm text-muted-foreground">Chưa có nhân viên.</li>}
        </ul>
      </section>
    </div>
  );
}
