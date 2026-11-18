import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, Briefcase, Calculator, ChevronRight, Clock, Plus, UserCheck, Users } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Progress } from "@/components/animate-ui/components/radix/progress";
import { AvatarGroup, AvatarGroupTooltip } from "@/components/animate-ui/components/animate/avatar-group";
import { EmployeeStatusBadge, ErrorState, LoadingState, PeriodStatusBadge, PersonAvatar, SectionTitle, StatTile } from "@/components/app/kit";
import { BlurIn, Count, Money, MoneyShort, Reveal, RevealGroup, SPRING } from "@/components/app/motion";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { formatDate, formatPeriod, givenName, greeting } from "@/lib/format";
import { groupByDepartment } from "@/lib/hr";

const today = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long" });

export default function AdminOverview() {
  const { user } = useAuth();
  const employeesQuery = useQuery({ queryKey: ["employees"], queryFn: api.employees });
  const periodsQuery = useQuery({ queryKey: ["payroll", "periods"], queryFn: api.payrollPeriods });
  const employees = useMemo(() => employeesQuery.data ?? [], [employeesQuery.data]);
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
  const progress = current && stats.total ? Math.min(100, (current.items_count / stats.total) * 100) : 0;

  return (
    <div className="space-y-12 md:space-y-16">
      {/* Hero */}
      <section className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="space-y-4">
          <Reveal offset={10}>
            <p className="text-eyebrow">Tổng quan quản trị · <span className="normal-case tracking-normal">{today.format(new Date())}</span></p>
          </Reveal>
          <BlurIn delay={60}>
            <h1 className="text-hero">
              {greeting()}, {givenName(user?.full_name)}.
            </h1>
          </BlurIn>
          <Reveal delay={160} offset={12}>
            <p className="text-lead max-w-xl">Tình hình nhân sự, hợp đồng và kỳ lương — đọc trực tiếp từ cơ sở dữ liệu.</p>
          </Reveal>
        </div>
        <Reveal delay={240} offset={12}>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin/bang-luong"><Calculator /> Tính lương</Link>
            </Button>
            <Button asChild>
              <Link to="/admin/nhan-vien?moi=1"><Plus /> Thêm nhân viên</Link>
            </Button>
          </div>
        </Reveal>
      </section>

      {/* Chỉ số */}
      {employeesQuery.error ? (
        <ErrorState error={employeesQuery.error} onRetry={employeesQuery.refetch} />
      ) : employeesQuery.isPending ? (
        <LoadingState rows={4} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <RevealGroup step={70} itemClassName="h-full">
            <StatTile label="Tổng nhân sự" value={<Count value={stats.total} />} icon={Users} hint={`${departments.length} phòng ban`} />
            <StatTile label="Đang làm việc" value={<Count value={stats.active} />} icon={UserCheck} hint={`${stats.leave} đang nghỉ phép`} />
            <StatTile label="Thử việc" value={<Count value={stats.probation} />} icon={Clock} hint="Cần đánh giá chuyển chính thức" />
            <StatTile label="Quỹ lương hợp đồng" value={<MoneyShort value={stats.fund} />} icon={Briefcase} hint="Lương cơ bản + phụ cấp / tháng" />
          </RevealGroup>
        </div>
      )}

      {/* Bento: kỳ lương (tile tối) + phòng ban */}
      <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr] lg:gap-4">
        <Reveal className="h-full">
          <section className="tile flex h-full flex-col justify-between gap-10 p-7 md:p-10">
            {periodsQuery.error ? (
              <p className="text-tile-muted">{periodsQuery.error.message}</p>
            ) : !current ? (
              <p className="text-tile-muted">{periodsQuery.isPending ? "Đang tải kỳ lương…" : "Chưa có kỳ lương nào."}</p>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <p className="text-[14px] font-semibold text-tile-muted">Kỳ lương hiện tại</p>
                    <PeriodStatusBadge status={current.status} onTile />
                  </div>
                  <p className="font-display text-[44px] leading-none font-semibold tracking-[-0.035em] md:text-[56px]">{formatPeriod(current.month_year)}</p>
                  <p className="text-[15px] text-tile-muted">
                    {current.standard_days} ngày công chuẩn · đã tính {current.items_count}/{stats.total} nhân viên
                  </p>
                </div>
                <div className="space-y-6">
                  <Progress value={progress} className="h-1.5 bg-white/12" aria-label="Tiến độ tính lương" />
                  <div className="flex flex-wrap items-end justify-between gap-6">
                    {lastPaid ? (
                      <div>
                        <p className="text-[13px] text-tile-muted">Đã chi {formatPeriod(lastPaid.month_year)}</p>
                        <Money value={lastPaid.total_net} className="mt-1 font-display text-[28px] font-semibold tracking-[-0.025em]" />
                      </div>
                    ) : (
                      <span />
                    )}
                    <Button variant="onTile" asChild>
                      <Link to="/admin/bang-luong">Mở bảng lương <ArrowRight /></Link>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </section>
        </Reveal>

        <Reveal delay={100} className="h-full">
          <section className="card flex h-full flex-col gap-6 p-7 md:p-8">
            <SectionTitle
              action={
                <Link to="/admin/phong-ban" className="group inline-flex items-center text-[14px] text-link">
                  Xem tất cả <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              }
            >
              Phòng ban
            </SectionTitle>
            <ul className="space-y-4">
              {departments.map((d, i) => (
                <li key={d.name} className="space-y-2">
                  <div className="flex justify-between text-[14px]">
                    <span className="text-foreground">{d.name}</span>
                    <span className="tabular text-muted-foreground">{d.members.length}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full rounded-full bg-foreground"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(d.members.length / maxDept) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ ...SPRING, delay: 0.15 + i * 0.06 }}
                    />
                  </div>
                </li>
              ))}
              {!departments.length && <li className="text-[14px] text-muted-foreground">Chưa có dữ liệu.</li>}
            </ul>
            {employees.length > 0 && (
              <div className="mt-auto flex items-center justify-between gap-4 border-t border-border/70 pt-5">
                <AvatarGroup className="h-9">
                  {employees.slice(0, 7).map((e) => (
                    <span key={e.id} className="rounded-full ring-2 ring-card">
                      <PersonAvatar name={e.full_name} seed={e.employee_code} size="sm" />
                      <AvatarGroupTooltip>{e.full_name}</AvatarGroupTooltip>
                    </span>
                  ))}
                </AvatarGroup>
                <span className="text-[13px] text-muted-foreground">{employees.length} người</span>
              </div>
            )}
          </section>
        </Reveal>
      </div>

      {/* Gia nhập gần đây */}
      <section className="space-y-5">
        <Reveal>
          <SectionTitle
            action={
              <Link to="/admin/nhan-vien" className="group inline-flex items-center text-[14px] text-link">
                Danh sách nhân viên <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            }
          >
            Gia nhập gần đây
          </SectionTitle>
        </Reveal>
        <Reveal delay={80}>
          <ul className="card divide-y divide-border/70 overflow-hidden">
            {recent.map((e, i) => (
              <motion.li
                key={e.id}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ ...SPRING, delay: 0.05 * i }}
              >
                <Link
                  to={`/admin/nhan-vien?xem=${e.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors duration-200 hover:bg-muted/60"
                >
                  <PersonAvatar name={e.full_name} seed={e.employee_code} size="sm" />
                  <span className="grid min-w-0 flex-1">
                    <span className="truncate text-[15px] font-medium text-foreground">{e.full_name}</span>
                    <span className="truncate text-[13px] text-muted-foreground">{e.position} · {e.department}</span>
                  </span>
                  <span className="tabular hidden text-[13px] text-muted-foreground sm:block">{formatDate(e.joined_at)}</span>
                  <EmployeeStatusBadge status={e.status} />
                  <ChevronRight className="size-4 text-muted-foreground/60" aria-hidden="true" />
                </Link>
              </motion.li>
            ))}
            {!recent.length && <li className="px-5 py-8 text-[14px] text-muted-foreground">Chưa có nhân viên.</li>}
          </ul>
        </Reveal>
      </section>
    </div>
  );
}
