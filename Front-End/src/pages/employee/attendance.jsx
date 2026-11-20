import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { CalendarCheck, CalendarClock, Clock, Percent } from "lucide-react";
import { KpiCard } from "@/components/admin/kpi-card";
import { EmptyState, ErrorState, LoadingState, PeriodStatusBadge } from "@/components/app/kit";
import { Reveal } from "@/components/app/motion";
import { todayShift, WeekSchedule } from "@/components/app/week-schedule";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Meter } from "@/components/ui/meter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmployeeDashboard } from "@/hooks/use-employee-dashboard";
import { WEEKDAYS } from "@/lib/constants";
import { formatNumber, formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";

/* Công chuẩn = mốc so sánh nên dùng màu trung tính; thực tế dùng màu nhấn. */
const DAYS_CHART = {
  standard: { label: "Công chuẩn", color: "var(--chart-5)" },
  actual: { label: "Ngày công thực tế", color: "var(--chart-1)" },
};
const OT_CHART = { ot: { label: "Giờ làm thêm", color: "var(--chart-4)" } };

const pctOf = (i) => (i.standard_days ? (i.actual_days / i.standard_days) * 100 : 0);
const shortPeriod = (m) => formatPeriod(m).replace("Tháng ", "T");

export default function EmployeeAttendance() {
  const { data, isPending, error, refetch } = useEmployeeDashboard();
  const history = useMemo(() => data?.payroll_history ?? [], [data]);
  const chartData = useMemo(
    () =>
      [...history]
        .reverse()
        .slice(-12)
        .map((i) => ({ label: shortPeriod(i.month_year), actual: i.actual_days, standard: i.standard_days, ot: i.ot_hours })),
    [history],
  );

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isPending) return <LoadingState rows={4} />;

  const summary = data.attendance_summary ?? {};
  const schedule = data.work_schedule ?? {};
  const workDays = WEEKDAYS.filter((d) => /\d/.test(schedule[d.key] ?? "")).length;
  const totalStandard = history.reduce((s, i) => s + (i.standard_days || 0), 0);
  const rate = totalStandard ? (summary.total_actual_days / totalStandard) * 100 : 0;
  const shift = todayShift(schedule);

  return (
    <div className="space-y-6">
      <header>
        <Reveal offset={8}>
          <h1 className="font-display text-[26px] font-semibold tracking-[-0.025em] md:text-[30px]">Chấm công</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Ngày công và giờ làm thêm theo từng kỳ lương — phòng nhân sự cập nhật khi tính lương.
          </p>
        </Reveal>
      </header>

      <section aria-label="Tổng hợp chấm công" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Tổng ngày công", icon: CalendarCheck, value: formatNumber(summary.total_actual_days), hint: `${history.length} kỳ lương` },
          {
            label: "Tỉ lệ đạt công chuẩn",
            icon: Percent,
            value: `${formatNumber(rate)}%`,
            hint: `${formatNumber(summary.total_actual_days)}/${totalStandard} ngày công chuẩn`,
            children: <Meter value={rate} label="Tỉ lệ đạt công chuẩn" />,
          },
          { label: "Tổng giờ làm thêm", icon: Clock, value: `${formatNumber(summary.total_ot_hours)} giờ`, hint: "Tính lương hệ số ×1,5" },
          { label: "Ngày làm việc / tuần", icon: CalendarClock, value: `${workDays} ngày`, hint: schedule.monday ? `Ca chuẩn ${schedule.monday}` : "Chưa cập nhật" },
        ].map((k, i) => (
          <Reveal key={k.label} delay={60 + i * 50} offset={10} className="h-full">
            <KpiCard {...k} />
          </Reveal>
        ))}
      </section>

      <Reveal delay={120} offset={14}>
        <Card className="gap-5">
          <CardHeader>
            <CardTitle>Lịch làm việc tuần</CardTitle>
            <CardDescription>
              Hôm nay ({shift.label}): {shift.off ? "nghỉ" : `ca ${shift.value}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WeekSchedule schedule={schedule} />
          </CardContent>
        </Card>
      </Reveal>

      {history.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="Chưa có dữ liệu chấm công" description="Dữ liệu xuất hiện khi phòng nhân sự nhập công cho kỳ lương đầu tiên." />
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-3">
            <Reveal delay={140} offset={14} className="h-full lg:col-span-2">
              <Card className="h-full gap-4">
                <CardHeader>
                  <CardTitle>Ngày công theo kỳ</CardTitle>
                  <CardDescription>Thực tế so với công chuẩn của từng kỳ</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <ChartContainer config={DAYS_CHART} className="aspect-auto h-[240px] w-full">
                    <BarChart data={chartData} margin={{ left: 0, right: 4, top: 8 }} barGap={2}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                      <ChartTooltip cursor={{ radius: 6 }} content={<ChartTooltipContent valueFormatter={(v) => `${formatNumber(v)} ngày`} />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="standard" fill="var(--color-standard)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="actual" fill="var(--color-actual)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </Reveal>
            <Reveal delay={190} offset={14} className="h-full">
              <Card className="h-full gap-4">
                <CardHeader>
                  <CardTitle>Giờ làm thêm</CardTitle>
                  <CardDescription>Theo từng kỳ lương</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <ChartContainer config={OT_CHART} className="aspect-auto h-[240px] w-full">
                    <BarChart data={chartData} margin={{ left: 0, right: 4, top: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                      <ChartTooltip cursor={{ radius: 6 }} content={<ChartTooltipContent valueFormatter={(v) => `${formatNumber(v)} giờ`} />} />
                      <Bar dataKey="ot" fill="var(--color-ot)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </Reveal>
          </div>

          <Reveal delay={160} offset={14}>
            <Card className="gap-0 py-0">
              <CardHeader className="border-b border-border/70 px-4 py-4 sm:px-5 [.border-b]:pb-4">
                <CardTitle>Chi tiết theo kỳ</CardTitle>
                <CardDescription>Bảng công đã được phòng nhân sự ghi nhận</CardDescription>
                <CardAction className="text-[12.5px] text-muted-foreground">{history.length} kỳ</CardAction>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4 sm:pl-5">Kỳ lương</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Ngày công</TableHead>
                    <TableHead className="w-[28%] max-md:hidden">Tỉ lệ</TableHead>
                    <TableHead className="pr-4 text-right sm:pr-5">Giờ OT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((i) => {
                    const pct = pctOf(i);
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="pl-4 font-medium sm:pl-5">{formatPeriod(i.month_year)}</TableCell>
                        <TableCell>
                          <PeriodStatusBadge status={i.period_status} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(i.actual_days)}
                          <span className="text-muted-foreground">/{i.standard_days}</span>
                        </TableCell>
                        <TableCell className="max-md:hidden">
                          <div className="flex items-center gap-3">
                            <Meter
                              value={pct}
                              className="h-1.5"
                              indicatorClassName={cn(pct < 80 && "bg-warning")}
                              label={`Tỉ lệ công ${formatPeriod(i.month_year)}`}
                            />
                            <span className="w-11 text-right text-[12.5px] text-muted-foreground tabular-nums">{formatNumber(pct)}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="pr-4 text-right tabular-nums sm:pr-5">{formatNumber(i.ot_hours)}h</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </Reveal>
        </>
      )}
    </div>
  );
}
