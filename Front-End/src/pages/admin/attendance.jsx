import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck2, CalendarPlus, Check, CircleDashed, Clock, Loader2, Lock, RefreshCw, Sigma, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { ErrorState, LoadingState, PeriodStatusBadge, PersonAvatar, SearchField, Segmented } from "@/components/app/kit";
import { Reveal } from "@/components/app/motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { formatDate, formatMoney, formatMoneyShort, formatNumber, formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CreatePeriodDialog, daysInMonthOf } from "./attendance-dialogs";

/*
 * Chấm công & OT (Admin / Kế toán C&B) — CHỈ XEM.
 * Ngày công & giờ OT được Back-End tổng hợp tự động từ chấm công theo ngày (attendance_records)
 * mỗi lần mở kỳ Nháp; không có ô nhập, không import, không sửa tay.
 *   Ngày công = Có mặt + Đi muộn + Remote + Nghỉ phép có lương (T2–T6), tối đa = công chuẩn
 *   Giờ OT    = tổng giờ OT trong tháng (kể cả cuối tuần)
 */

function Stepper({ period, synced, eligible }) {
  const closed = period.status !== "DRAFT";
  const steps = [
    { title: "Tạo kỳ lương", desc: formatPeriod(period.month_year), done: true },
    { title: "Đồng bộ chấm công", desc: `${synced}/${eligible} nhân viên`, done: eligible > 0 && synced >= eligible, current: !closed },
    { title: "Tính lương tự động", desc: "Gross · BH · Thuế · Net", done: synced > 0 },
    { title: "Chốt & chi trả", desc: closed ? (period.status === "PAID" ? "Đã chi trả" : "Đã khoá") : "Chờ chốt kỳ", done: closed },
  ];

  return (
    <ol className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4">
      {steps.map((s, i) => (
        <li key={s.title} className="relative flex items-start gap-3">
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold transition-colors",
              s.done
                ? "border-transparent bg-primary text-primary-foreground"
                : s.current
                  ? "border-primary text-primary"
                  : "border-border text-muted-foreground",
            )}
          >
            {s.done ? <Check className="size-3.5" /> : i + 1}
          </span>
          <span className="grid min-w-0 gap-0.5">
            <span className={cn("text-[13px] font-medium", !s.done && !s.current && "text-muted-foreground")}>{s.title}</span>
            <span className="truncate text-[12px] text-muted-foreground">{s.desc}</span>
          </span>
          {i < steps.length - 1 && <span aria-hidden="true" className="absolute top-3.5 right-0 left-11 -z-10 hidden h-px bg-border lg:block" />}
        </li>
      ))}
    </ol>
  );
}

function MiniStat({ icon: Icon, label, value, hint }) {
  return (
    <Card className="gap-1.5 px-4 py-4">
      <p className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" /> {label}
      </p>
      <p className="font-display text-[22px] font-semibold tracking-[-0.02em] tabular-nums">{value}</p>
      {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function RowState({ row }) {
  if (row.base_salary === null) return <Badge variant="outline" className="text-muted-foreground">Thiếu HĐ</Badge>;
  if (row.payroll_item_id) return <Badge variant="success"><Check /> Đã tính</Badge>;
  return <Badge variant="warning"><CircleDashed /> Chưa có công</Badge>;
}

/** Phần tách ngày công theo trạng thái chấm công — giải thích nguồn số liệu. */
function Breakdown({ b }) {
  if (!b) return null;
  const parts = [
    ["Có mặt", b.present],
    ["Muộn", b.late],
    ["Remote", b.remote],
    ["Phép", b.paid_leave],
    ["Nghỉ không lương", b.unpaid_leave],
    ["Vắng", b.absent],
  ].filter(([, n]) => n > 0);
  if (!parts.length) return <span className="text-muted-foreground">Chưa có chấm công</span>;
  return (
    <span className="text-[12px] text-muted-foreground">
      {parts.map(([k, n]) => `${k} ${n}`).join(" · ")}
    </span>
  );
}

function AttendanceGrid({ period, rows, syncedUntil }) {
  const closed = period.status !== "DRAFT";
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [filter, setFilter] = useState("all");

  const departments = useMemo(() => [...new Set(rows.map((r) => r.department).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi")), [rows]);
  const counts = useMemo(
    () => ({
      all: rows.length,
      done: rows.filter((r) => r.payroll_item_id).length,
      pending: rows.filter((r) => !r.payroll_item_id).length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (department !== "all" && r.department !== department) return false;
      if (filter === "done" && !r.payroll_item_id) return false;
      if (filter === "pending" && r.payroll_item_id) return false;
      if (!q) return true;
      return [r.full_name, r.employee_code, r.department].some((v) => String(v ?? "").toLowerCase().includes(q));
    });
  }, [rows, query, department, filter]);

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="gap-1 border-b border-border/70 px-4 py-4 sm:px-5 [.border-b]:pb-4">
        <CardTitle>Bảng ngày công & OT</CardTitle>
        <CardDescription>
          {closed
            ? "Kỳ lương đã chốt — số liệu cố định, không thay đổi."
            : `Tự động tổng hợp từ chấm công hằng ngày${syncedUntil ? ` · dữ liệu đến ${formatDate(syncedUntil)}` : ""} · không chỉnh sửa tay`}
        </CardDescription>
        <CardAction>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-[12.5px] text-muted-foreground">
            <Lock className="size-3.5" /> Chỉ xem
          </span>
        </CardAction>
      </CardHeader>

      <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-3 sm:px-5 lg:flex-row lg:items-center">
        <SearchField value={query} onChange={setQuery} placeholder="Tìm tên, mã NV…" label="Tìm nhân viên" className="lg:w-64" />
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger size="sm" className="lg:w-48" aria-label="Lọc phòng ban">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả phòng ban</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Segmented
          value={filter}
          onValueChange={setFilter}
          label="Lọc trạng thái"
          className="lg:ml-auto"
          options={[
            { value: "all", label: "Tất cả", count: counts.all },
            { value: "done", label: "Đã tính", count: counts.done },
            { value: "pending", label: "Chưa có", count: counts.pending },
          ]}
        />
      </div>

      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4 sm:pl-5">Nhân viên</TableHead>
              <TableHead className="max-lg:hidden">Chi tiết chấm công</TableHead>
              <TableHead className="text-right">Ngày công</TableHead>
              <TableHead className="text-right">Giờ OT</TableHead>
              <TableHead className="text-right max-lg:hidden">Gross</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead className="pr-4 sm:pr-5">Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="py-12 text-center text-[13px] text-muted-foreground">
                  Không có nhân viên phù hợp bộ lọc.
                </TableCell>
              </TableRow>
            )}
            {visible.map((r) => (
              <TableRow key={r.user_id}>
                <TableCell className="pl-4 sm:pl-5">
                  <div className="flex min-w-[180px] items-center gap-2.5">
                    <PersonAvatar name={r.full_name} seed={r.employee_code} src={r.avatar} size="xs" />
                    <div className="grid min-w-0 leading-tight">
                      <span className="truncate text-[13.5px] font-medium">{r.full_name}</span>
                      <span className="truncate text-[12px] text-muted-foreground">
                        <span className="font-mono">{r.employee_code}</span> · {r.department || "—"}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="whitespace-normal max-lg:hidden">
                  <Breakdown b={r.breakdown} />
                </TableCell>
                <TableCell className="text-right text-[13.5px] tabular-nums">
                  {r.payroll_item_id ? (
                    <>
                      {formatNumber(r.actual_days)}
                      <span className="text-muted-foreground">/{period.standard_days}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right text-[13.5px] tabular-nums">{r.payroll_item_id ? `${formatNumber(r.ot_hours)}h` : "—"}</TableCell>
                <TableCell className="text-right text-[13px] tabular-nums max-lg:hidden">{r.payroll_item_id ? formatMoney(r.gross_salary) : "—"}</TableCell>
                <TableCell className="text-right text-[13px] font-medium tabular-nums">
                  {r.payroll_item_id ? formatMoney(r.net_salary) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="pr-4 sm:pr-5">
                  <RowState row={r} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);

  const periodsQuery = useQuery({ queryKey: ["payroll", "periods"], queryFn: api.payrollPeriods });
  const periods = useMemo(() => periodsQuery.data ?? [], [periodsQuery.data]);
  const requested = Number(searchParams.get("ky"));
  const period = periods.find((p) => p.id === requested) ?? periods.find((p) => p.status === "DRAFT") ?? periods[0] ?? null;

  const attendanceQuery = useQuery({
    queryKey: ["payroll", "attendance", period?.id],
    queryFn: () => api.payrollAttendance(period.id),
    enabled: Boolean(period),
  });
  const rows = useMemo(() => attendanceQuery.data?.items ?? [], [attendanceQuery.data]);
  const livePeriod = attendanceQuery.data?.period ? { ...period, ...attendanceQuery.data.period } : period;
  const draft = livePeriod?.status === "DRAFT";

  const stats = useMemo(() => {
    const synced = rows.filter((r) => r.payroll_item_id);
    return {
      eligible: rows.filter((r) => r.base_salary !== null).length,
      missing: rows.filter((r) => r.base_salary === null).length,
      synced: synced.length,
      days: synced.reduce((s, r) => s + (r.actual_days || 0), 0),
      ot: synced.reduce((s, r) => s + (r.ot_hours || 0), 0),
      net: synced.reduce((s, r) => s + (r.net_salary || 0), 0),
      gross: synced.reduce((s, r) => s + (r.gross_salary || 0), 0),
    };
  }, [rows]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["payroll"] });
    toast.success("Đã đồng bộ lại ngày công & OT từ chấm công");
  };

  const lock = useMutation({
    mutationFn: () => api.lockPayrollPeriod(livePeriod.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
      toast.success(`Đã khoá sổ kỳ ${formatPeriod(livePeriod.month_year)}`);
    },
    onError: (err) => toast.error(err.message),
  });
  const confirmLock = () => {
    if (window.confirm(`Khoá sổ kỳ ${formatPeriod(livePeriod.month_year)}? Sau khi khoá, ngày công và bảng lương không thay đổi nữa.`)) lock.mutate();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <Reveal offset={8}>
          <div className="space-y-1">
            <p className="text-eyebrow">Tiền lương</p>
            <h1 className="page-title">Chấm công & OT</h1>
            <p className="text-[14px] text-muted-foreground">Ngày công và giờ làm thêm được tổng hợp tự động từ chấm công hằng ngày — lương tính theo đó.</p>
          </div>
        </Reveal>
        <Reveal delay={80} offset={8}>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
              <CalendarPlus /> Tạo kỳ lương
            </Button>
            {period && draft && (
              <>
                <Button variant="outline" size="sm" onClick={refresh} disabled={attendanceQuery.isFetching}>
                  {attendanceQuery.isFetching ? <Loader2 className="animate-spin" /> : <RefreshCw />} Đồng bộ lại
                </Button>
                <Button size="sm" onClick={confirmLock} disabled={lock.isPending || !stats.synced}>
                  {lock.isPending ? <Loader2 className="animate-spin" /> : <Lock />} Khoá sổ kỳ
                </Button>
              </>
            )}
          </div>
        </Reveal>
      </header>

      {periodsQuery.isLoading ? (
        <LoadingState rows={4} />
      ) : periodsQuery.error ? (
        <ErrorState error={periodsQuery.error} onRetry={() => periodsQuery.refetch()} />
      ) : !period ? (
        <Reveal>
          <Card className="items-center px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CalendarPlus className="size-5" />
            </span>
            <div className="space-y-1">
              <p className="text-[17px] font-semibold">Chưa có kỳ lương nào</p>
              <p className="max-w-sm text-[14px] text-muted-foreground">Tạo kỳ lương cho tháng hiện tại — ngày công & OT sẽ tự đồng bộ từ chấm công.</p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <CalendarPlus /> Tạo kỳ lương mới
            </Button>
          </Card>
        </Reveal>
      ) : (
        <>
          <Reveal delay={60} offset={12}>
            <Card className="gap-5 py-5">
              <CardHeader className="px-5 sm:grid-cols-[1fr_auto]">
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={String(period.id)} onValueChange={(id) => setSearchParams({ ky: String(id) })}>
                    <SelectTrigger className="h-10 min-w-[190px] font-medium" aria-label="Chọn kỳ lương">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {periods.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {formatPeriod(p.month_year)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <PeriodStatusBadge status={livePeriod.status} />
                  <span className="text-[13px] text-muted-foreground">
                    Công chuẩn <b className="font-medium text-foreground tabular-nums">{livePeriod.standard_days}</b> ngày (T2–T6) ·{" "}
                    {daysInMonthOf(livePeriod.month_year)} ngày trong tháng
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-5">
                <Stepper period={livePeriod} synced={stats.synced} eligible={stats.eligible} />
              </CardContent>
            </Card>
          </Reveal>

          <section aria-label="Thống kê kỳ" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                icon: CalendarCheck2,
                label: "Đã có công",
                value: (
                  <>
                    {stats.synced}
                    <span className="text-[15px] text-muted-foreground">/{stats.eligible}</span>
                  </>
                ),
                hint: stats.missing ? `${stats.missing} nhân viên chưa có hợp đồng` : "Tất cả đều có hợp đồng",
              },
              { icon: Sigma, label: "Tổng ngày công", value: formatNumber(stats.days), hint: "Từ chấm công T2–T6" },
              { icon: Clock, label: "Tổng giờ OT", value: `${formatNumber(stats.ot)} giờ`, hint: "Hệ số OT ×1,5" },
              { icon: Wallet, label: draft ? "Net tạm tính" : "Tổng Net", value: formatMoneyShort(stats.net), hint: `Gross ${formatMoneyShort(stats.gross)}` },
            ].map((s, i) => (
              <Reveal key={s.label} delay={100 + i * 50} offset={10} className="h-full">
                <MiniStat {...s} />
              </Reveal>
            ))}
          </section>

          <Reveal delay={160} offset={14}>
            {attendanceQuery.isLoading ? (
              <LoadingState rows={5} />
            ) : attendanceQuery.error ? (
              <ErrorState error={attendanceQuery.error} onRetry={() => attendanceQuery.refetch()} />
            ) : (
              <AttendanceGrid key={period.id} period={livePeriod} rows={rows} syncedUntil={attendanceQuery.data?.syncedUntil} />
            )}
          </Reveal>
        </>
      )}

      <CreatePeriodDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        periods={periods}
        onCreated={(p) => p?.id && setSearchParams({ ky: String(p.id) })}
      />
    </div>
  );
}
