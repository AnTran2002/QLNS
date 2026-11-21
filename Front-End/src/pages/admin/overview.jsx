import { useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import { ArrowRight, ArrowUpRight, CalendarClock, ClipboardList, Clock, FileSignature, Landmark, Users, Wallet } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { KpiCard, TrendBadge } from "@/components/admin/kpi-card";
import { ErrorState, LoadingState, PeriodStatusBadge, PersonAvatar } from "@/components/app/kit";
import { Reveal } from "@/components/app/motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  lineCursor,
  lineProps,
  seriesMotion,
} from "@/components/ui/chart";
import { Meter } from "@/components/ui/meter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { EMPLOYEE_STATUSES } from "@/lib/constants";
import { formatMoney, formatMoneyShort, formatMonthShort, formatNumber, formatPeriod, rowsOfChartYear } from "@/lib/format";
import { groupByDepartment } from "@/lib/hr";

const todayLabel = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/* Màu theo thực thể — cố định thứ tự, đã kiểm tra tương phản & mù màu cho cả nền sáng/tối. */
const PERIOD_CHART = {
  gross: { label: "Tổng thu nhập (Gross)", color: "var(--chart-1)" },
  net: { label: "Thực nhận (Net)", color: "var(--chart-3)" },
};
const STATUS_COLORS = {
  "Đang làm việc": "var(--chart-1)",
  "Thử việc": "var(--chart-2)",
  "Nghỉ phép": "var(--chart-3)",
};
const STATUS_CHART = Object.fromEntries(EMPLOYEE_STATUSES.map((s) => [s, { label: s, color: STATUS_COLORS[s] }]));
const DEPT_CHART = { payroll: { label: "Quỹ lương / tháng", color: "var(--chart-1)" } };
const STRUCTURE = [
  { key: "net", label: "Thực nhận", color: "var(--chart-1)" },
  { key: "insurance", label: "BHXH · BHYT · BHTN", color: "var(--chart-2)" },
  { key: "tax", label: "Thuế TNCN", color: "var(--chart-3)" },
];

const pctChange = (now, before) => (before > 0 ? ((now - before) / before) * 100 : null);
const sum = (rows, key) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);

/* ------------------------------------------------------------------ */

function PeriodChart({ periods }) {
  const { year, data } = useMemo(() => {
    const picked = rowsOfChartYear([...periods].filter((p) => p.items_count > 0).reverse());
    return {
      year: picked.year,
      data: picked.rows.map((p) => ({ label: formatMonthShort(p.month_year), period: formatPeriod(p.month_year), gross: p.total_gross, net: p.total_net })),
    };
  }, [periods]);

  return (
    <Card className="h-full gap-4">
      <CardHeader>
        <CardTitle>Quỹ lương theo kỳ</CardTitle>
        <CardDescription>Tổng Gross và Net của từng tháng trong năm {year}</CardDescription>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {data.length === 0 ? (
          <p className="flex h-[240px] items-center justify-center text-[13px] text-muted-foreground">Chưa có kỳ lương nào được tính.</p>
        ) : data.length === 1 ? (
          <div className="flex h-[240px] flex-col justify-center gap-4 px-1">
            <p className="text-[12.5px] text-muted-foreground">{data[0].period} — kỳ duy nhất đã tính trong năm</p>
            <dl className="grid grid-cols-2 gap-4">
              {["gross", "net"].map((k) => (
                <div key={k}>
                  <dt className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                    <span className="size-2 rounded-full" style={{ background: PERIOD_CHART[k].color }} aria-hidden="true" />
                    {PERIOD_CHART[k].label}
                  </dt>
                  <dd className="mt-1 font-display text-[24px] font-semibold tracking-[-0.02em] tabular-nums">
                    {formatMoneyShort(data[0][k])}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-[12px] text-muted-foreground">Biểu đồ đường hiển thị khi có từ 2 kỳ lương trở lên.</p>
          </div>
        ) : (
          <ChartContainer config={PERIOD_CHART} className="aspect-auto h-[260px] w-full">
            <LineChart data={data} margin={{ left: 4, right: 12, top: 10 }}>
              <CartesianGrid vertical={false} strokeDasharray="0" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} padding={{ left: 12, right: 12 }} />
              <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v) => formatMoneyShort(v)} />
              <ChartTooltip
                cursor={lineCursor}
                content={<ChartTooltipContent labelFormatter={(_, payload) => payload?.[0]?.payload?.period ?? ""} valueFormatter={formatMoney} />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Line {...lineProps("gross", 0)} />
              <Line {...lineProps("net", 1)} />
            </LineChart>
          </ChartContainer>
        )}
        {data.length > 0 && <p className="mt-1 text-center text-[12.5px] font-medium text-muted-foreground tabular-nums">Năm {year}</p>}
      </CardContent>
    </Card>
  );
}

function StatusDonut({ employees }) {
  const data = EMPLOYEE_STATUSES.map((s) => ({
    status: s,
    value: employees.filter((e) => e.status === s).length,
    fill: STATUS_COLORS[s],
  }));
  const total = employees.length;

  return (
    <Card className="h-full gap-4">
      <CardHeader>
        <CardTitle>Trạng thái nhân sự</CardTitle>
        <CardDescription>Theo cột users.status</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center gap-5">
        <div className="relative mx-auto aspect-square w-full max-w-[200px]">
          <ChartContainer config={STATUS_CHART} className="aspect-square h-full w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="status" valueFormatter={(v) => `${v} người`} />} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="status"
                innerRadius="68%"
                outerRadius="100%"
                paddingAngle={2}
                cornerRadius={4}
                stroke="var(--card)"
                strokeWidth={2}
              >
                {data.map((d) => (
                  <Cell key={d.status} fill={d.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-[30px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{total}</span>
            <span className="mt-1 text-[12px] text-muted-foreground">nhân sự</span>
          </div>
        </div>
        <ul className="grid gap-2 text-[13px]">
          {data.map((d) => (
            <li key={d.status} className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: d.fill }} aria-hidden="true" />
              <span className="flex-1 text-muted-foreground">{d.status}</span>
              <span className="font-medium tabular-nums">{d.value}</span>
              <span className="w-10 text-right text-muted-foreground tabular-nums">{total ? Math.round((d.value / total) * 100) : 0}%</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function DepartmentChart({ employees }) {
  const data = useMemo(
    () =>
      groupByDepartment(employees)
        .map((d) => ({ name: d.name, payroll: d.payroll, members: d.members.length }))
        .sort((a, b) => b.payroll - a.payroll),
    [employees],
  );

  return (
    <Card className="h-full gap-4">
      <CardHeader>
        <CardTitle>Quỹ lương theo phòng ban</CardTitle>
        <CardDescription>Lương cơ bản + phụ cấp theo hợp đồng hiện hành</CardDescription>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {data.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-muted-foreground">Chưa có nhân viên.</p>
        ) : (
          <ChartContainer config={DEPT_CHART} className="aspect-auto w-full" style={{ height: Math.max(140, data.length * 46 + 16) }}>
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 56 }} barCategoryGap={10}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={96} tick={{ fontSize: 12 }} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => (
                      <div className="grid w-full gap-0.5">
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Quỹ lương</span>
                          <span className="font-mono font-medium tabular-nums">{formatMoney(value)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Nhân sự</span>
                          <span className="font-mono font-medium tabular-nums">{item.payload.members}</span>
                        </div>
                      </div>
                    )}
                  />
                }
              />
              <Bar dataKey="payroll" {...seriesMotion(0)} fill="var(--color-payroll)" radius={4} maxBarSize={26}>
                <LabelList
                  dataKey="payroll"
                  position="right"
                  offset={8}
                  className="fill-foreground"
                  fontSize={12}
                  formatter={(v) => formatMoneyShort(v)}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

/** Cơ cấu Gross của kỳ gần nhất: Net / Bảo hiểm / Thuế — thanh xếp chồng tĩnh. */
function PayoutStructure({ period, items }) {
  const entered = items.filter((i) => i.payroll_item_id);
  const gross = sum(entered, "gross_salary");
  const values = {
    net: sum(entered, "net_salary"),
    insurance: sum(entered, "social_insurance"),
    tax: sum(entered, "personal_tax"),
  };

  return (
    <Card className="h-full gap-4">
      <CardHeader>
        <CardTitle>Cơ cấu chi trả</CardTitle>
        <CardDescription>
          {period ? `${formatPeriod(period.month_year)} · ${entered.length} phiếu lương` : "Chưa có kỳ đã tính"}
        </CardDescription>
        {period && (
          <CardAction>
            <PeriodStatusBadge status={period.status} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="text-[12px] text-muted-foreground">Tổng Gross</p>
          <p className="font-display text-[24px] font-semibold tracking-[-0.02em] tabular-nums">{formatMoney(gross)}</p>
        </div>
        <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-muted" aria-hidden="true">
          {gross > 0 &&
            STRUCTURE.map((s) => (
              <div
                key={s.key}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ width: `${(values[s.key] / gross) * 100}%`, background: s.color }}
              />
            ))}
        </div>
        <ul className="grid gap-2.5 text-[13px]">
          {STRUCTURE.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} aria-hidden="true" />
              <span className="flex-1 text-muted-foreground">{s.label}</span>
              <span className="font-medium tabular-nums">{formatMoneyShort(values[s.key])}</span>
              <span className="w-11 text-right text-muted-foreground tabular-nums">
                {gross > 0 ? `${((values[s.key] / gross) * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%` : "—"}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function TopOvertime({ period, items }) {
  const top = [...items]
    .filter((i) => i.payroll_item_id && i.ot_hours > 0)
    .sort((a, b) => b.ot_hours - a.ot_hours)
    .slice(0, 5);
  const max = Math.max(1, ...top.map((t) => t.ot_hours));

  return (
    <Card className="h-full gap-4">
      <CardHeader>
        <CardTitle>Giờ OT nhiều nhất</CardTitle>
        <CardDescription>{period ? formatPeriod(period.month_year) : "—"}</CardDescription>
        <CardAction>
          <Clock className="size-4 text-muted-foreground" />
        </CardAction>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-muted-foreground">Không có giờ OT trong kỳ.</p>
        ) : (
          <ul className="grid gap-4">
            {top.map((t) => (
              <li key={t.user_id} className="flex items-center gap-3">
                <PersonAvatar name={t.full_name} seed={t.employee_code} src={t.avatar} size="xs" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="truncate font-medium">{t.full_name}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{formatNumber(t.ot_hours)} giờ</span>
                  </div>
                  <Meter value={(t.ot_hours / max) * 100} className="h-1.5" label={`${t.full_name}: ${t.ot_hours} giờ OT`} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PeriodsTable({ periods, headcount }) {
  const navigate = useNavigate();
  return (
    <Card className="h-full gap-2 pb-2">
      <CardHeader>
        <CardTitle>Kỳ lương</CardTitle>
        <CardDescription>Bảng payroll_periods · bấm một kỳ để mở lưới chấm công</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/bang-luong">
              Bảng lương <ArrowUpRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 sm:px-3">
        {periods.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-muted-foreground">Chưa có kỳ lương nào.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Kỳ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right max-md:hidden">Công chuẩn</TableHead>
                <TableHead className="text-right max-sm:hidden">Đã nhập</TableHead>
                <TableHead className="text-right max-sm:hidden">Gross</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.slice(0, 6).map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/admin/cham-cong?ky=${p.id}`)}>
                  <TableCell className="font-medium">{formatPeriod(p.month_year)}</TableCell>
                  <TableCell>
                    <PeriodStatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums max-md:hidden">{p.standard_days} ngày</TableCell>
                  <TableCell className="text-right tabular-nums max-sm:hidden">
                    {p.items_count}
                    <span className="text-muted-foreground">/{headcount}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums max-sm:hidden">{formatMoneyShort(p.total_gross)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatMoneyShort(p.total_net)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

export default function AdminOverview() {
  const employeesQuery = useQuery({ queryKey: ["employees"], queryFn: api.employees });
  const periodsQuery = useQuery({ queryKey: ["payroll", "periods"], queryFn: api.payrollPeriods });
  const employees = useMemo(() => employeesQuery.data ?? [], [employeesQuery.data]);
  const periods = useMemo(() => periodsQuery.data ?? [], [periodsQuery.data]);

  // Kỳ đang mở (DRAFT) để theo dõi tiến độ đồng bộ công; kỳ gần nhất đã có dữ liệu để thống kê chi trả.
  const openPeriod = periods.find((p) => p.status === "DRAFT") ?? periods[0];
  const withItems = periods.filter((p) => p.items_count > 0);
  const latest = withItems[0];
  const previous = withItems[1];

  const latestQuery = useQuery({
    queryKey: ["payroll", "attendance", latest?.id],
    queryFn: () => api.payrollAttendance(latest.id),
    enabled: Boolean(latest),
  });
  const latestItems = latestQuery.data?.items ?? [];

  const stats = useMemo(() => {
    const withContract = employees.filter((e) => e.contract_id || e.base_salary > 0);
    return {
      total: employees.length,
      active: employees.filter((e) => e.status === "Đang làm việc").length,
      probation: employees.filter((e) => e.status === "Thử việc").length,
      contracts: withContract.length,
      fund: employees.reduce((s, e) => s + (e.base_salary || 0) + (e.allowance || 0), 0),
      insurance: employees.reduce((s, e) => s + (e.insurance_salary || 0), 0),
    };
  }, [employees]);

  if (employeesQuery.isLoading || periodsQuery.isLoading) return <LoadingState rows={4} />;
  if (employeesQuery.error || periodsQuery.error) {
    return (
      <ErrorState
        error={employeesQuery.error || periodsQuery.error}
        onRetry={() => {
          employeesQuery.refetch();
          periodsQuery.refetch();
        }}
      />
    );
  }

  const openEntered = openPeriod?.items_count ?? 0;
  const openProgress = stats.total ? Math.min(100, (openEntered / stats.total) * 100) : 0;
  const netTrend = latest && previous ? pctChange(latest.total_net, previous.total_net) : null;
  const missingContracts = stats.total - stats.contracts;

  return (
    <div className="space-y-6">
      {/* Tiêu đề */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Reveal offset={8}>
          <div className="space-y-1">
            <p className="text-[13px] text-muted-foreground first-letter:uppercase">{todayLabel.format(new Date())}</p>
            <h1 className="page-title">Tổng quan quản trị</h1>
            <p className="text-[14px] text-muted-foreground">Nhân sự, hợp đồng và tiền lương — số liệu đọc trực tiếp từ CSDL qlns.</p>
          </div>
        </Reveal>
        <Reveal delay={80} offset={8}>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/nhan-vien">
                <Users /> Nhân viên
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/admin/cham-cong">
                <ClipboardList /> Nhập công & OT
              </Link>
            </Button>
          </div>
        </Reveal>
      </header>

      {/* KPI */}
      <section aria-label="Chỉ số chính" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Reveal delay={0} offset={14} className="h-full">
          <KpiCard
            label="Tổng nhân sự"
            icon={Users}
            value={formatNumber(stats.total)}
            action={<Badge variant="secondary">{stats.active} đang làm</Badge>}
            footer={`${stats.probation} thử việc · ${stats.total - stats.active - stats.probation} nghỉ phép`}
            hint="Bảng users (mọi vai trò)"
          />
        </Reveal>
        <Reveal delay={60} offset={14} className="h-full">
          <KpiCard
            label="Quỹ lương hợp đồng / tháng"
            icon={FileSignature}
            value={formatMoneyShort(stats.fund)}
            footer={`${stats.contracts} hợp đồng hiệu lực`}
            hint={
              missingContracts > 0
                ? `${missingContracts} nhân viên chưa có hợp đồng`
                : `Lương đóng BH: ${formatMoneyShort(stats.insurance)}`
            }
          />
        </Reveal>
        <Reveal delay={120} offset={14} className="h-full">
          <KpiCard
            label={latest ? `Thực nhận · ${formatPeriod(latest.month_year)}` : "Thực nhận kỳ gần nhất"}
            icon={Wallet}
            value={latest ? formatMoneyShort(latest.total_net) : "—"}
            action={<TrendBadge value={netTrend} />}
            footer={latest ? `Gross ${formatMoneyShort(latest.total_gross)}` : "Chưa có kỳ đã tính"}
            hint={previous ? `So với ${formatPeriod(previous.month_year)}` : `${latest?.items_count ?? 0} phiếu lương`}
          />
        </Reveal>
        <Reveal delay={180} offset={14} className="h-full">
          <KpiCard
            label={openPeriod ? `Chấm công · ${formatPeriod(openPeriod.month_year)}` : "Đồng bộ chấm công"}
            icon={CalendarClock}
            value={
              <span>
                {openEntered}
                <span className="text-[18px] text-muted-foreground">/{stats.total}</span>
              </span>
            }
            action={openPeriod && <PeriodStatusBadge status={openPeriod.status} />}
            hint={
              openPeriod ? (
                <Link to={`/admin/cham-cong?ky=${openPeriod.id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                  {openEntered >= stats.total ? "Đã đồng bộ đủ — xem bảng công" : "Xem bảng công tự động"} <ArrowRight className="size-3.5" />
                </Link>
              ) : (
                <Link to="/admin/cham-cong" className="inline-flex items-center gap-1 text-primary hover:underline">
                  Tạo kỳ lương tháng này <ArrowRight className="size-3.5" />
                </Link>
              )
            }
          >
            <Meter value={openProgress} label="Tiến độ đồng bộ chấm công" />
          </KpiCard>
        </Reveal>
      </section>

      {/* Biểu đồ */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <Reveal delay={120} offset={14} className="h-full lg:col-span-2">
          <PeriodChart periods={periods} />
        </Reveal>
        <Reveal delay={180} offset={14} className="h-full">
          <StatusDonut employees={employees} />
        </Reveal>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <Reveal offset={14} className="h-full lg:col-span-2">
          <DepartmentChart employees={employees} />
        </Reveal>
        <Reveal delay={60} offset={14} className="h-full">
          <PayoutStructure period={latest} items={latestItems} />
        </Reveal>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <Reveal offset={14} className="h-full lg:col-span-2">
          <PeriodsTable periods={periods} headcount={stats.total} />
        </Reveal>
        <Reveal delay={60} offset={14} className="h-full">
          <TopOvertime period={latest} items={latestItems} />
        </Reveal>
      </section>

      <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <Landmark className="size-3.5" /> Gross = lương theo ngày công + phụ cấp + OT; Net = Gross − BH (10,5%) − thuế TNCN.
      </p>
    </div>
  );
}
