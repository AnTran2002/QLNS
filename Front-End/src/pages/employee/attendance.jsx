import { CalendarCheck, Clock, Timer } from "lucide-react";
import { EmptyState, ErrorState, LoadingBlock, PageHeader, PeriodStatusBadge, StatCard } from "@/components/app/shared";
import { useEmployeeDashboard } from "@/hooks/use-employee-dashboard";
import { WEEKDAYS } from "@/lib/constants";
import { formatNumber, formatPeriod } from "@/lib/format";
import { WeekSchedule } from "@/components/app/week-schedule";

export default function EmployeeAttendance() {
  const { data, isPending, error, refetch } = useEmployeeDashboard();
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isPending) return <LoadingBlock rows={4} />;

  const history = data.payroll_history ?? [];
  const summary = data.attendance_summary ?? {};
  const schedule = data.work_schedule ?? {};
  const workDays = WEEKDAYS.filter((d) => /\d/.test(schedule[d.key] ?? "")).length;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Chấm công" title="Chấm công & lịch làm việc" description="Số ngày công và giờ làm thêm theo từng kỳ lương. Dữ liệu chỉ xem — phòng nhân sự cập nhật khi tính lương." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Tổng ngày công" value={formatNumber(summary.total_actual_days)} icon={CalendarCheck} hint={`${history.length} kỳ lương`} />
        <StatCard label="Tổng giờ làm thêm" value={`${formatNumber(summary.total_ot_hours)}h`} icon={Clock} hint="Tính hệ số 1,5" />
        <StatCard label="Ngày làm việc / tuần" value={workDays} icon={Timer} hint={schedule.monday ? `Ca chuẩn ${schedule.monday}` : "Chưa cập nhật"} />
      </div>

      <section className="space-y-4 rounded-xl bg-surface-card p-6 md:p-8">
        <h2 className="display-sm">Lịch làm việc tuần</h2>
        <WeekSchedule schedule={schedule} />
      </section>

      <section className="space-y-4">
        <h2 className="display-sm">Theo kỳ lương</h2>
        {history.length === 0 ? (
          <EmptyState title="Chưa có dữ liệu chấm công" />
        ) : (
          <ul className="space-y-3">
            {history.map((i) => {
              const pct = i.standard_days ? Math.min(100, (i.actual_days / i.standard_days) * 100) : 0;
              return (
                <li key={i.id} className="rounded-lg border border-hairline p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-ink">{formatPeriod(i.month_year)}</p>
                      <PeriodStatusBadge status={i.period_status} />
                    </div>
                    <p className="tabular text-[14px] text-body">
                      <span className="font-medium text-ink">{formatNumber(i.actual_days)}</span>/{i.standard_days} ngày · {formatNumber(i.ot_hours)}h OT
                    </p>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-card" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`Tỉ lệ công ${formatPeriod(i.month_year)}`}>
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-2 text-[13px] text-muted-foreground">Đạt {formatNumber(pct)}% công chuẩn</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
