import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, CalendarDays, Clock, FileText, Users, Wallet } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { ErrorState, LoadingState, PeriodStatusBadge, SectionTitle, StatTile } from "@/components/app/kit";
import { BlurIn, Count, Money, MoneyShort, Reveal, RevealGroup } from "@/components/app/motion";
import { WeekSchedule } from "@/components/app/week-schedule";
import { useEmployeeDashboard } from "@/hooks/use-employee-dashboard";
import { formatMoney, formatNumber, formatPeriod, givenName, greeting, tenureLabel } from "@/lib/format";
import { PayslipDialog } from "./payslip-dialog";

export default function EmployeeOverview() {
  const { data, isPending, error, refetch } = useEmployeeDashboard();
  const [payslip, setPayslip] = useState(null);

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isPending) return <LoadingState rows={4} />;

  const { user_info: user, contract, payroll_history: history = [], current_period: period, work_schedule: schedule, team_members: team = [] } = data;
  const latest = history[0];

  return (
    <div className="space-y-12 md:space-y-16">
      <section className="space-y-4">
        <Reveal offset={10}>
          <p className="text-eyebrow">Cổng nhân viên</p>
        </Reveal>
        <BlurIn delay={60}>
          <h1 className="text-hero">{greeting()}, {givenName(user.full_name)}.</h1>
        </BlurIn>
        <Reveal delay={160} offset={12}>
          <p className="text-lead max-w-xl">
            {user.position} · {user.department} · gắn bó {tenureLabel(user.joined_at)}.
          </p>
        </Reveal>
      </section>

      <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr] lg:gap-4">
        {/* Phiếu lương gần nhất — tile tối */}
        <Reveal className="h-full">
          <section className="tile flex h-full flex-col justify-between gap-10 p-7 md:p-10">
            {latest ? (
              <>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-[14px] font-semibold text-tile-muted">Thực nhận · {formatPeriod(latest.month_year)}</p>
                    <PeriodStatusBadge status={latest.period_status} onTile />
                  </div>
                  <Money
                    value={latest.net_salary}
                    className="font-display text-[44px] leading-none font-semibold tracking-[-0.04em] md:text-[60px]"
                  />
                  <p className="text-[14px] text-tile-muted">
                    Gross {formatMoney(latest.gross_salary)} · BHXH {formatMoney(latest.social_insurance)} · Thuế {formatMoney(latest.personal_tax)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setPayslip(latest)}><FileText /> Xem phiếu lương</Button>
                  <Button variant="onTile" asChild><Link to="/nhan-vien/phieu-luong">Lịch sử lương <ArrowRight /></Link></Button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-[14px] font-semibold text-tile-muted">Phiếu lương</p>
                <p className="font-display text-[30px] leading-tight font-semibold tracking-[-0.03em]">Chưa có kỳ lương nào được tính.</p>
                <p className="text-[15px] text-tile-muted">Phiếu lương sẽ xuất hiện khi phòng nhân sự chốt bảng lương.</p>
              </div>
            )}
          </section>
        </Reveal>

        {/* Lịch tuần */}
        <Reveal delay={100} className="h-full">
          <section className="card flex h-full flex-col gap-6 p-7 md:p-8">
            <SectionTitle action={<CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />}>Lịch tuần này</SectionTitle>
            <WeekSchedule schedule={schedule} />
            <p className="mt-auto text-[14px] text-muted-foreground">
              Kỳ lương hiện tại: <span className="text-foreground">{formatPeriod(period?.month_year)}</span>
              {period && <> · {period.standard_days} ngày công chuẩn</>}
            </p>
          </section>
        </Reveal>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <RevealGroup step={70} itemClassName="h-full">
          <StatTile
            label="Ngày công kỳ gần nhất"
            value={latest ? <>{formatNumber(latest.actual_days)}<span className="text-muted-foreground">/{latest.standard_days}</span></> : "—"}
            icon={CalendarDays}
            hint={latest ? formatPeriod(latest.month_year) : "Chưa có dữ liệu"}
          />
          <StatTile label="Giờ làm thêm" value={latest ? <Count value={latest.ot_hours} suffix="h" /> : "—"} icon={Clock} hint={`Tổng ${formatNumber(data.attendance_summary?.total_ot_hours)}h mọi kỳ`} />
          <StatTile label="Lương cơ bản" value={contract ? <MoneyShort value={contract.base_salary} /> : "—"} icon={Wallet} hint={contract ? `Phụ cấp ${formatMoney(contract.allowance)}` : "Chưa có hợp đồng"} />
          <StatTile label="Đồng nghiệp cùng phòng" value={<Count value={Math.max(team.length - 1, 0)} />} icon={Users} hint={user.department} />
        </RevealGroup>
      </div>

      <PayslipDialog item={payslip} user={user} onOpenChange={(o) => !o && setPayslip(null)} />
    </div>
  );
}
