import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, CalendarCheck, CalendarDays, Clock, FileText, Sparkles, UsersRound, Wallet } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { KpiCard, TrendBadge } from "@/components/admin/kpi-card";
import { EarningsChart } from "@/components/employee/earnings-chart";
import { ErrorState, LoadingState, PeriodStatusBadge, PersonAvatar } from "@/components/app/kit";
import { Reveal } from "@/components/app/motion";
import { PayoutBar } from "@/components/app/payslip";
import { todayShift, WeekSchedule } from "@/components/app/week-schedule";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { useEmployeeDashboard } from "@/hooks/use-employee-dashboard";
import { monthToDateEarnings } from "@/lib/hr";
import { formatMoney, formatNumber, formatPeriod, givenName, greeting, tenureLabel } from "@/lib/format";
import { PayslipDialog } from "./payslip-dialog";

const todayLabel = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const pctChange = (now, before) => (before > 0 ? ((now - before) / before) * 100 : null);

/** Thời điểm hiện tại, cập nhật mỗi phút — đủ để số ngày đã làm đổi đúng lúc hết ca / sang ngày mới. */
function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function LatestPayslip({ item, onOpen }) {
  return (
    <Card className="h-full gap-4">
      <CardHeader>
        <CardTitle>Phiếu lương gần nhất</CardTitle>
        <CardDescription>{item ? formatPeriod(item.month_year) : "Chưa có kỳ lương"}</CardDescription>
        {item && (
          <CardAction>
            <PeriodStatusBadge status={item.period_status} />
          </CardAction>
        )}
      </CardHeader>
      {item ? (
        <>
          <CardContent className="space-y-5">
            <div>
              <p className="text-[12px] text-muted-foreground">Thực nhận</p>
              <p className="font-display text-[28px] font-semibold tracking-[-0.03em] tabular-nums">{formatMoney(item.net_salary)}</p>
            </div>
            <PayoutBar item={item} />
            <dl className="grid grid-cols-2 gap-3 text-[13px]">
              {[
                ["Gross", formatMoney(item.gross_salary)],
                ["Ngày công", `${formatNumber(item.actual_days)}/${item.standard_days}`],
                ["BHXH", formatMoney(item.social_insurance)],
                ["Thuế TNCN", formatMoney(item.personal_tax)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-muted/50 px-3 py-2">
                  <dt className="text-[11.5px] text-muted-foreground">{k}</dt>
                  <dd className="font-medium tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
          <CardFooter className="mt-auto">
            <Button variant="outline" size="sm" className="w-full" onClick={onOpen}>
              <FileText /> Xem phiếu lương
            </Button>
          </CardFooter>
        </>
      ) : (
        <CardContent className="flex flex-1 items-center justify-center text-center text-[13px] text-muted-foreground">
          Phiếu lương sẽ xuất hiện khi phòng nhân sự tính lương kỳ đầu tiên.
        </CardContent>
      )}
    </Card>
  );
}

function TeamPreview({ team, me }) {
  const others = team.filter((m) => m.id !== me.id);
  return (
    <Card className="h-full gap-4">
      <CardHeader>
        <CardTitle>Phòng {me.department}</CardTitle>
        <CardDescription>{team.length} thành viên</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/nhan-vien/dong-nghiep">
              Xem tất cả <ArrowRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {others.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Chưa có đồng nghiệp cùng phòng.</p>
        ) : (
          <ul className="grid gap-1">
            {others.slice(0, 4).map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60">
                <PersonAvatar name={m.full_name} seed={m.employee_code} src={m.avatar} size="xs" />
                <span className="grid min-w-0 flex-1 leading-tight">
                  <span className="truncate text-[13.5px] font-medium">{m.full_name}</span>
                  <span className="truncate text-[12px] text-muted-foreground">{m.position}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function EmployeeOverview() {
  const { data, isPending, error, refetch } = useEmployeeDashboard();
  const [payslip, setPayslip] = useState(null);
  const now = useNow();

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isPending) return <LoadingState rows={4} />;

  const { user_info: user, contract, payroll_history: history = [], current_period: period, work_schedule: schedule = {}, team_members: team = [] } = data;
  const [latest, previous] = history;
  const mtd = monthToDateEarnings({ contract, schedule, period, joinedAt: user.joined_at, now });
  const shift = todayShift(schedule);
  const attendancePct = latest?.standard_days ? (latest.actual_days / latest.standard_days) * 100 : 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <Reveal offset={8}>
          <div className="space-y-1">
            <p className="text-[13px] text-muted-foreground first-letter:uppercase">{todayLabel.format(now)}</p>
            <h1 className="page-title">
              {greeting(now)}, {givenName(user.full_name)}
            </h1>
            <p className="text-[14px] text-muted-foreground">
              {user.position} · {user.department} · gắn bó {tenureLabel(user.joined_at)}
            </p>
          </div>
        </Reveal>
        <Reveal delay={80} offset={8}>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/nhan-vien/cham-cong">
                <CalendarCheck /> Chấm công
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/nhan-vien/phieu-luong">
                <FileText /> Phiếu lương
              </Link>
            </Button>
          </div>
        </Reveal>
      </header>

      <section aria-label="Chỉ số chính" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Reveal delay={60} offset={10} className="h-full">
          <KpiCard
            label={`Đã làm được · ${formatPeriod(mtd.monthYear)}`}
            icon={Sparkles}
            value={contract ? formatMoney(mtd.earned) : "—"}
            hint={contract ? `${formatMoney(mtd.dailyRate)}/ngày · tạm tính, chưa trừ BH & thuế` : "Chưa có hợp đồng lao động"}
          >
            {contract && (
              <div className="space-y-1.5">
                <Meter value={mtd.standardDays ? (mtd.workedDays / mtd.standardDays) * 100 : 0} label="Ngày công đã làm tháng này" />
                <p className="text-[12px] text-muted-foreground tabular-nums">
                  {formatNumber(mtd.workedDays)}/{mtd.standardDays} ngày công
                </p>
              </div>
            )}
          </KpiCard>
        </Reveal>
        <Reveal delay={110} offset={10} className="h-full">
          <KpiCard
            label="Thực nhận kỳ gần nhất"
            icon={Wallet}
            value={latest ? formatMoney(latest.net_salary) : "—"}
            action={previous && <TrendBadge value={pctChange(latest.net_salary, previous.net_salary)} />}
            footer={latest ? formatPeriod(latest.month_year) : null}
            hint={previous ? `So với ${formatPeriod(previous.month_year).toLowerCase()}` : "Chưa có kỳ trước để so sánh"}
          />
        </Reveal>
        <Reveal delay={160} offset={10} className="h-full">
          <KpiCard
            label="Ngày công kỳ gần nhất"
            icon={CalendarDays}
            value={
              latest ? (
                <>
                  {formatNumber(latest.actual_days)}
                  <span className="text-[18px] text-muted-foreground">/{latest.standard_days}</span>
                </>
              ) : (
                "—"
              )
            }
            hint={latest ? `Đạt ${formatNumber(attendancePct)}% công chuẩn` : "Chưa có dữ liệu"}
          >
            {latest && <Meter value={attendancePct} label="Tỉ lệ ngày công kỳ gần nhất" />}
          </KpiCard>
        </Reveal>
        <Reveal delay={210} offset={10} className="h-full">
          <KpiCard
            label="Giờ làm thêm kỳ gần nhất"
            icon={Clock}
            value={latest ? `${formatNumber(latest.ot_hours)} giờ` : "—"}
            footer={`Tổng ${formatNumber(data.attendance_summary?.total_ot_hours)} giờ mọi kỳ`}
            hint="Tính lương hệ số ×1,5"
          />
        </Reveal>
      </section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 [&>*]:min-w-0">
        <Reveal delay={120} offset={14} className="h-full lg:col-span-2">
          <EarningsChart history={history} />
        </Reveal>
        <Reveal delay={170} offset={14} className="h-full">
          <LatestPayslip item={latest} onOpen={() => setPayslip(latest)} />
        </Reveal>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 [&>*]:min-w-0">
        <Reveal delay={120} offset={14} className="h-full lg:col-span-2">
          <Card className="h-full gap-5">
            <CardHeader>
              <CardTitle>Lịch làm việc tuần này</CardTitle>
              <CardDescription>
                Hôm nay ({shift.label}): {shift.off ? "nghỉ" : `ca ${shift.value}`}
              </CardDescription>
              <CardAction>
                {period && (
                  <span className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                    {formatPeriod(period.month_year)} <PeriodStatusBadge status={period.status} />
                  </span>
                )}
              </CardAction>
            </CardHeader>
            <CardContent>
              <WeekSchedule schedule={schedule} />
            </CardContent>
            {period && (
              <CardFooter className="text-[12.5px] text-muted-foreground">
                Kỳ lương hiện tại có {period.standard_days} ngày công chuẩn.
              </CardFooter>
            )}
          </Card>
        </Reveal>
        <Reveal delay={170} offset={14} className="h-full">
          {team.length > 0 ? (
            <TeamPreview team={team} me={user} />
          ) : (
            <Card className="h-full items-center justify-center text-center text-[13px] text-muted-foreground">
              <UsersRound className="size-5" /> Chưa có đồng nghiệp cùng phòng.
            </Card>
          )}
        </Reveal>
      </div>

      <PayslipDialog item={payslip} user={user} onOpenChange={(o) => !o && setPayslip(null)} />
    </div>
  );
}
