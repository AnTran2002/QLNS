import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, CalendarDays, Clock, FileText, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingBlock, PeriodStatusBadge, StatCard } from "@/components/app/shared";
import { useEmployeeDashboard } from "@/hooks/use-employee-dashboard";
import { formatMoney, formatMoneyShort, formatNumber, formatPeriod, givenName, greeting, tenureLabel } from "@/lib/format";
import { WeekSchedule } from "@/components/app/week-schedule";
import { PayslipDialog } from "./payslip-dialog";

export default function EmployeeOverview() {
  const { data, isPending, error, refetch } = useEmployeeDashboard();
  const [payslip, setPayslip] = useState(null);

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isPending) return <LoadingBlock rows={4} />;

  const { user_info: user, contract, payroll_history: history = [], current_period: period, work_schedule: schedule, team_members: team = [] } = data;
  const latest = history[0];

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <p className="caption-upper text-primary">Cổng nhân viên</p>
        <h1 className="display-lg">{greeting()}, {givenName(user.full_name)}.</h1>
        <p className="max-w-xl text-[16px] leading-relaxed text-muted-foreground">
          {user.position} · {user.department} · gắn bó {tenureLabel(user.joined_at)}.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Phiếu lương gần nhất — dark surface */}
        <section className="flex flex-col justify-between gap-8 rounded-xl bg-surface-dark p-6 text-on-dark md:p-8">
          {latest ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <p className="caption-upper text-primary">Thực nhận · {formatPeriod(latest.month_year)}</p>
                  <PeriodStatusBadge status={latest.period_status} />
                </div>
                <p className="tabular font-serif text-[44px] leading-none tracking-[-1px] md:text-[52px]">{formatMoney(latest.net_salary)}</p>
                <p className="text-[14px] text-on-dark-soft">
                  Gross {formatMoney(latest.gross_salary)} · BHXH {formatMoney(latest.social_insurance)} · Thuế {formatMoney(latest.personal_tax)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setPayslip(latest)}><FileText /> Xem phiếu lương</Button>
                <Button variant="dark" asChild><Link to="/nhan-vien/phieu-luong">Lịch sử lương <ArrowRight /></Link></Button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <p className="caption-upper text-primary">Phiếu lương</p>
              <p className="font-serif text-[28px]">Chưa có kỳ lương nào được tính.</p>
              <p className="text-[14px] text-on-dark-soft">Phiếu lương sẽ xuất hiện khi phòng nhân sự chốt bảng lương.</p>
            </div>
          )}
        </section>

        {/* Lịch tuần */}
        <section className="space-y-5 rounded-xl bg-surface-card p-6 md:p-8">
          <div className="flex items-baseline justify-between">
            <h2 className="display-sm">Lịch tuần này</h2>
            <CalendarDays className="size-4 text-muted-soft" />
          </div>
          <WeekSchedule schedule={schedule} />
          <p className="text-[13px] text-muted-foreground">
            Kỳ lương hiện tại: <span className="text-ink">{formatPeriod(period?.month_year)}</span>
            {period && <> · {period.standard_days} ngày công chuẩn</>}
          </p>
        </section>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ngày công kỳ gần nhất" value={latest ? `${formatNumber(latest.actual_days)}/${latest.standard_days}` : "—"} icon={CalendarDays} hint={latest ? formatPeriod(latest.month_year) : "Chưa có dữ liệu"} />
        <StatCard label="Giờ làm thêm" value={latest ? `${formatNumber(latest.ot_hours)}h` : "—"} icon={Clock} hint={`Tổng ${formatNumber(data.attendance_summary?.total_ot_hours)}h mọi kỳ`} />
        <StatCard label="Lương cơ bản" value={contract ? formatMoneyShort(contract.base_salary) : "—"} icon={Wallet} hint={contract ? `Phụ cấp ${formatMoneyShort(contract.allowance)}` : "Chưa có hợp đồng"} />
        <StatCard label="Đồng nghiệp cùng phòng" value={Math.max(team.length - 1, 0)} icon={Users} hint={user.department} />
      </div>

      <PayslipDialog item={payslip} user={user} onOpenChange={(o) => !o && setPayslip(null)} />
    </div>
  );
}
