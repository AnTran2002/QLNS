import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { CalendarCheck, CalendarX2, ChevronLeft, ChevronRight, Clock, Clock3, DatabaseZap, Timer } from "lucide-react";
import { KpiCard } from "@/components/admin/kpi-card";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { EmptyState, ErrorState, LoadingState, PeriodStatusBadge } from "@/components/app/kit";
import { Reveal } from "@/components/app/motion";
import {
  ATTENDANCE_STATUS,
  MonthCalendar,
  STATUS_ORDER,
  StatusLegend,
  buildMonth,
  summarizeMonth,
  todayKey,
} from "@/components/employee/month-calendar";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  columnCursor,
  columnProps,
} from "@/components/ui/chart";
import { Meter } from "@/components/ui/meter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmployeeAttendance, useEmployeeDashboard } from "@/hooks/use-employee-dashboard";
import { formatNumber, formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";

const DAILY_CHART = {
  work: { label: "Giờ làm", color: "var(--chart-1)" },
  ot: { label: "Làm thêm", color: "var(--chart-2)" },
};
const PERIOD_CHART = {
  standard: { label: "Công chuẩn", color: "var(--chart-5)" },
  actual: { label: "Ngày công thực tế", color: "var(--chart-1)" },
};
const OT_CHART = { ot: { label: "Giờ làm thêm", color: "var(--chart-2)" } };

const WEEKDAY_NAME = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const pctOf = (i) => (i.standard_days ? (i.actual_days / i.standard_days) * 100 : 0);
const shortPeriod = (m) => formatPeriod(m).replace("Tháng ", "T");
const hours = (v) => `${formatNumber(v)} giờ`;

function longDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${WEEKDAY_NAME[date.getDay()]}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

/** Ngày mặc định khi mở tháng: hôm nay (nếu thuộc tháng) → ngày có dữ liệu gần nhất → ngày 1. */
function defaultDay(month, cells) {
  const today = todayKey();
  if (today.startsWith(month)) return today;
  const recorded = cells.filter((c) => c?.record);
  return recorded.at(-1)?.key ?? `${month}-01`;
}

export default function EmployeeAttendance() {
  const [month, setMonth] = useState(null); // null = tháng mới nhất có dữ liệu (server quyết định)
  const [direction, setDirection] = useState(0);
  const [selected, setSelected] = useState(null);
  const att = useEmployeeAttendance(month);
  const dash = useEmployeeDashboard();

  const activeMonth = att.data?.month ?? month;
  const months = useMemo(() => att.data?.months ?? [], [att.data]); // mới nhất trước
  const cells = useMemo(() => (activeMonth ? buildMonth(activeMonth, att.data?.records ?? []) : []), [activeMonth, att.data]);
  const stats = useMemo(() => summarizeMonth(cells), [cells]);

  // Đổi tháng → chọn lại ngày mặc định của tháng đó.
  useEffect(() => {
    if (activeMonth && cells.length && !selected?.startsWith(activeMonth)) setSelected(defaultDay(activeMonth, cells));
  }, [activeMonth, cells, selected]);

  const history = useMemo(() => dash.data?.payroll_history ?? [], [dash.data]);
  const periodData = useMemo(
    () =>
      [...history]
        .reverse()
        .slice(-12)
        .map((i) => ({
          label: shortPeriod(i.month_year),
          actual: i.actual_days,
          standard: i.standard_days,
          ot: i.ot_hours,
        })),
    [history],
  );
  const dailyData = useMemo(
    () =>
      cells
        .filter((c) => c?.record)
        .map((c) => ({
          label: String(c.day),
          work: c.record.work_hours,
          ot: c.record.ot_hours,
        })),
    [cells],
  );

  const error = att.error ?? dash.error;
  if (error) return <ErrorState error={error} onRetry={() => (att.refetch(), dash.refetch())} />;
  if (att.isPending || dash.isPending) return <LoadingState rows={4} />;

  const idx = months.indexOf(activeMonth);
  const go = (step) => {
    const next = months[idx - step]; // danh sách xếp mới → cũ
    if (!next) return;
    setDirection(step);
    setMonth(next);
  };
  const selectedCell = cells.find((c) => c?.key === selected) ?? null;
  const attendRate = stats.elapsed ? (stats.worked / stats.elapsed) * 100 : 0;
  const shiftRecord = att.data?.records?.[0];
  const shiftText = shiftRecord
    ? `${shiftRecord.shift} · ${shiftRecord.shift_start}–${shiftRecord.shift_end}`
    : "Ca hành chính · 08:30–17:30";

  return (
    <div className="space-y-6">
      <header>
        <Reveal offset={8}>
          <h1 className="page-title">Chấm công</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">Lịch đi làm theo tháng, ca làm và tổng hợp ngày công của bạn.</p>
        </Reveal>
      </header>

      {att.data?.available === false ? (
        <EmptyState
          icon={DatabaseZap}
          title="Chưa bật chấm công theo ngày"
          description="Database chưa có bảng attendance_records. Hãy chạy migration Back-End/database/migrations/004_avatar_daily_attendance.sql."
        />
      ) : (
        <>
          <section aria-label="Tổng hợp tháng" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Buổi đi làm",
                icon: CalendarCheck,
                value: `${stats.worked}/${stats.elapsed}`,
                hint: `${formatNumber(attendRate)}% ngày làm việc đã qua · công chuẩn ${stats.standard}`,
                children: <Meter value={attendRate} label="Tỉ lệ đi làm trong tháng" />,
              },
              {
                label: "Buổi nghỉ",
                icon: CalendarX2,
                value: `${stats.off} buổi`,
                hint: `${stats.count.LEAVE} nghỉ phép · ${stats.count.ABSENT} không phép`,
              },
              {
                label: "Đi muộn",
                icon: Clock3,
                value: `${stats.count.LATE} lần`,
                hint: stats.count.LATE ? `Tổng ${stats.lateMinutes} phút muộn` : "Không có lần nào",
              },
              {
                label: "Tổng giờ làm",
                icon: Timer,
                value: hours(stats.hours),
                hint: `+ ${hours(stats.ot)} làm thêm`,
              },
            ].map((k, i) => (
              <Reveal key={k.label} delay={60 + i * 50} offset={10} className="h-full">
                <KpiCard {...k} />
              </Reveal>
            ))}
          </section>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_320px] [&>*]:min-w-0">
            <Reveal delay={120} offset={14} className="h-full">
              <Card className="h-full gap-4">
                <CardHeader>
                  <CardTitle>Lịch đi làm</CardTitle>
                  <CardDescription>{shiftText}</CardDescription>
                  <CardAction className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => go(-1)}
                      disabled={idx < 0 || idx >= months.length - 1}
                      aria-label="Tháng trước"
                    >
                      <ChevronLeft />
                    </Button>
                    <span className="min-w-[96px] text-center text-[13.5px] font-medium tabular-nums" aria-live="polite">
                      {activeMonth ? formatPeriod(activeMonth) : "—"}
                    </span>
                    <Button variant="ghost" size="icon-sm" onClick={() => go(1)} disabled={idx <= 0} aria-label="Tháng sau">
                      <ChevronRight />
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-4 px-3 sm:px-6">
                  {months.length === 0 ? (
                    <EmptyState
                      icon={CalendarCheck}
                      title="Chưa có dữ liệu chấm công"
                      description="Lịch sẽ hiện khi có bản ghi chấm công đầu tiên."
                    />
                  ) : (
                    <div className="overflow-hidden">
                      <AnimatePresence mode="wait" initial={false} custom={direction}>
                        <motion.div
                          key={activeMonth}
                          custom={direction}
                          variants={{
                            enter: (d) => ({ opacity: 0, x: d * 24 }),
                            center: { opacity: 1, x: 0 },
                            exit: (d) => ({ opacity: 0, x: d * -24 }),
                          }}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          transition={{
                            duration: 0.28,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        >
                          <MonthCalendar
                            cells={cells}
                            selected={selected}
                            onSelect={setSelected}
                            layoutKey={`calendar-selected-${activeMonth}`}
                          />
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  )}
                  <StatusLegend />
                </CardContent>
              </Card>
            </Reveal>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 xl:content-start [&>*]:min-w-0">
              <Reveal delay={160} offset={14} className="h-full">
                <DayDetail cell={selectedCell} />
              </Reveal>
              <Reveal delay={200} offset={14} className="h-full">
                <Card className="h-full gap-4">
                  <CardHeader>
                    <CardTitle>Phân bổ trạng thái</CardTitle>
                    <CardDescription>{stats.recorded} buổi đã ghi nhận trong tháng</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {STATUS_ORDER.map((s) => {
                        const meta = ATTENDANCE_STATUS[s];
                        const Icon = meta.icon;
                        const n = stats.count[s];
                        const pct = stats.recorded ? (n / stats.recorded) * 100 : 0;
                        return (
                          <li key={s} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2 text-[13px]">
                              <span className="flex items-center gap-2">
                                <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                                {meta.label}
                              </span>
                              <span className="font-medium tabular-nums">
                                {n}
                                <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">{formatNumber(pct)}%</span>
                              </span>
                            </div>
                            <Meter value={pct} className="h-1.5" indicatorClassName={meta.dot} label={`${meta.label}: ${n} buổi`} />
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              </Reveal>
            </div>
          </div>

          {dailyData.length > 0 && <DailyHoursChart data={dailyData} month={activeMonth} />}
        </>
      )}

      {history.length > 0 && <PeriodSection history={history} data={periodData} />}
    </div>
  );
}

/** Chi tiết ngày đang chọn trên lịch. */
function DayDetail({ cell }) {
  const r = cell?.record;
  const meta = r ? ATTENDANCE_STATUS[r.status] : null;
  const Icon = meta?.icon;
  return (
    <Card className="h-full gap-4">
      <CardHeader>
        <CardTitle>Chi tiết ngày</CardTitle>
        <CardDescription>{cell ? longDate(cell.key) : "Chọn một ngày trên lịch"}</CardDescription>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={cell?.key ?? "none"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {meta ? (
              <div className="space-y-4">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-medium", meta.chip)}>
                  <Icon className="size-3.5" aria-hidden="true" />
                  {meta.label}
                </span>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
                  <Item label="Ca làm" value={r.shift} wide />
                  <Item label="Giờ ca" value={`${r.shift_start}–${r.shift_end}`} />
                  <Item label="Giờ vào / ra" value={r.check_in ? `${r.check_in}–${r.check_out}` : "—"} />
                  <Item label="Giờ làm" value={hours(r.work_hours)} />
                  <Item label="Làm thêm" value={r.ot_hours ? hours(r.ot_hours) : "—"} />
                  {r.note && <Item label="Ghi chú" value={r.note} wide />}
                </dl>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-[13.5px] text-muted-foreground">
                <Clock className="size-4" aria-hidden="true" />
                {!cell ? "—" : cell.weekend ? "Nghỉ cuối tuần." : cell.future ? "Ngày chưa tới." : "Chưa có bản ghi chấm công."}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

function Item({ label, value, wide }) {
  return (
    <div className={cn("min-w-0", wide && "col-span-2")}>
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate font-medium tabular-nums">{value}</dd>
    </div>
  );
}

/** Cột chồng giờ làm + làm thêm từng ngày trong tháng (cùng đơn vị giờ → một trục). */
function DailyHoursChart({ data, month }) {
  return (
    <Reveal delay={140} offset={14}>
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Giờ làm theo ngày</CardTitle>
          <CardDescription>{formatPeriod(month)} · giờ trong ca và giờ làm thêm</CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <ChartContainer config={DAILY_CHART} className="aspect-auto h-[220px] w-full">
            <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }} barCategoryGap="22%">
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={12} />
              <YAxis tickLine={false} axisLine={false} width={28} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} />
              <ChartTooltip
                cursor={columnCursor}
                content={<ChartTooltipContent labelFormatter={(l) => `Ngày ${l}`} valueFormatter={(v) => hours(v)} />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar {...columnProps("work", 0, { stackId: "d" })} maxBarSize={16} />
              <Bar {...columnProps("ot", 1, { stackId: "d", top: true })} maxBarSize={16} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </Reveal>
  );
}

/** Ngày công / OT theo kỳ lương (dữ liệu phòng nhân sự chốt khi tính lương). */
function PeriodSection({ history, data }) {
  return (
    <>
      {data.length >= 2 && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 [&>*]:min-w-0">
          <Reveal delay={140} offset={14} className="h-full lg:col-span-2">
            <Card className="h-full gap-4">
              <CardHeader>
                <CardTitle>Ngày công theo kỳ lương</CardTitle>
                <CardDescription>Thực tế so với công chuẩn của từng kỳ</CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <ChartContainer config={PERIOD_CHART} className="aspect-auto h-[240px] w-full">
                  <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }} barGap={2} barCategoryGap="24%">
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                    <ChartTooltip cursor={columnCursor} content={<ChartTooltipContent valueFormatter={(v) => `${formatNumber(v)} ngày`} />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar {...columnProps("standard", 0)} />
                    <Bar {...columnProps("actual", 1)} />
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
                  <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }} barCategoryGap="30%">
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                    <ChartTooltip cursor={columnCursor} content={<ChartTooltipContent valueFormatter={(v) => hours(v)} />} />
                    <Bar {...columnProps("ot", 0)} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      )}

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
                <TableHead className="max-sm:hidden">Trạng thái</TableHead>
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
                    <TableCell className="max-sm:hidden">
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
  );
}
