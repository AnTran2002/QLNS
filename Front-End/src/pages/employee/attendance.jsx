import { CalendarCheck, Clock, Timer } from "lucide-react";
import { Progress } from "@/components/animate-ui/components/radix/progress";
import { EmptyState, ErrorState, LoadingState, PageHeader, PeriodStatusBadge, SectionTitle, StatTile } from "@/components/app/kit";
import { Count, Reveal, RevealGroup } from "@/components/app/motion";
import { WeekSchedule } from "@/components/app/week-schedule";
import { useEmployeeDashboard } from "@/hooks/use-employee-dashboard";
import { WEEKDAYS } from "@/lib/constants";
import { formatNumber, formatPeriod } from "@/lib/format";

export default function EmployeeAttendance() {
  const { data, isPending, error, refetch } = useEmployeeDashboard();
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isPending) return <LoadingState rows={4} />;

  const history = data.payroll_history ?? [];
  const summary = data.attendance_summary ?? {};
  const schedule = data.work_schedule ?? {};
  const workDays = WEEKDAYS.filter((d) => /\d/.test(schedule[d.key] ?? "")).length;

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Chấm công" title="Chấm công & lịch làm việc" description="Ngày công và giờ làm thêm theo từng kỳ lương. Phòng nhân sự cập nhật khi tính lương." />

      <div className="grid gap-3 sm:grid-cols-3 lg:gap-4">
        <RevealGroup step={70} itemClassName="h-full">
          <StatTile label="Tổng ngày công" value={<Count value={summary.total_actual_days} />} icon={CalendarCheck} hint={`${history.length} kỳ lương`} />
          <StatTile label="Tổng giờ làm thêm" value={<Count value={summary.total_ot_hours} suffix="h" />} icon={Clock} hint="Tính hệ số 1,5" />
          <StatTile label="Ngày làm việc / tuần" value={<Count value={workDays} />} icon={Timer} hint={schedule.monday ? `Ca chuẩn ${schedule.monday}` : "Chưa cập nhật"} />
        </RevealGroup>
      </div>

      <Reveal delay={100}>
        <section className="card space-y-6 p-7 md:p-8">
          <SectionTitle>Lịch làm việc tuần</SectionTitle>
          <WeekSchedule schedule={schedule} />
        </section>
      </Reveal>

      <section className="space-y-5">
        <Reveal>
          <SectionTitle>Theo kỳ lương</SectionTitle>
        </Reveal>
        {history.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="Chưa có dữ liệu chấm công" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:gap-4">
            <RevealGroup step={60} itemClassName="h-full">
              {history.map((i) => {
                const pct = i.standard_days ? Math.min(100, (i.actual_days / i.standard_days) * 100) : 0;
                return (
                  <article key={i.id} className="card card-hover h-full p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <p className="text-[17px] font-semibold text-foreground">{formatPeriod(i.month_year)}</p>
                        <PeriodStatusBadge status={i.period_status} />
                      </div>
                      <p className="tabular text-[14px] text-muted-foreground">{formatNumber(i.ot_hours)}h OT</p>
                    </div>
                    <p className="mt-5 font-display text-[34px] leading-none font-semibold tracking-[-0.03em] text-foreground">
                      {formatNumber(i.actual_days)}
                      <span className="text-[20px] text-muted-foreground">/{i.standard_days} ngày</span>
                    </p>
                    <Progress value={pct} className="mt-5" aria-label={`Tỉ lệ công ${formatPeriod(i.month_year)}`} />
                    <p className="mt-2 text-[13px] text-muted-foreground">Đạt {formatNumber(pct)}% công chuẩn</p>
                  </article>
                );
              })}
            </RevealGroup>
          </div>
        )}
      </section>
    </div>
  );
}
