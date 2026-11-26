import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarCheck2,
  CalendarPlus,
  Check,
  CircleDashed,
  Clock,
  FileSpreadsheet,
  History,
  Loader2,
  Lock,
  Pencil,
  RotateCcw,
  Save,
  Sigma,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { ErrorState, LoadingState, PeriodStatusBadge, PersonAvatar, SearchField, Segmented } from "@/components/app/kit";
import { Reveal } from "@/components/app/motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/animate-ui/components/radix/dialog";
import { api } from "@/lib/api";
import { formatMoney, formatMoneyShort, formatNumber, formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CreatePeriodDialog, daysInMonthOf, ImportDialog } from "./attendance-dialogs";

/*
 * Chấm công & OT (Admin / Kế toán C&B)
 *   <<use>>    Tạo Kỳ lương mới (Tháng/Năm)         → CreatePeriodDialog
 *   <<use>>    Chấm công theo ngày + nhập OT        → AttendanceGrid
 *   <<extend>> Import file Excel công (.xlsx)       → ImportDialog
 */

const FIELDS = ["ot_hours"];
const toInput = (v) => (v === null || v === undefined ? "" : String(v));
const parseNum = (s) => Number(String(s).trim().replace(",", "."));

/* ------------------------------------------------------------------ */

function Stepper({ period, entered, eligible }) {
  const closed = period.status !== "DRAFT";
  const steps = [
    { title: "Tạo kỳ lương", desc: formatPeriod(period.month_year), done: true },
    {
      title: "Nhập OT",
      desc: `${entered}/${eligible} nhân viên`,
      done: eligible > 0 && entered >= eligible,
      current: !closed,
    },
    { title: "Tính lương tự động", desc: "Gross · BH · Thuế · Net khi lưu", done: entered > 0 },
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
          {i < steps.length - 1 && (
            <span aria-hidden="true" className="absolute top-3.5 right-0 left-11 -z-10 hidden h-px bg-border lg:block" />
          )}
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

/* ------------------------------------------------------------------ */
/* Grid nhập liệu                                                      */
/* ------------------------------------------------------------------ */

function CellInput({ row, field, value, error, dirty, disabled, rowIndex, onChange, onNavigate, suffix }) {
  return (
    <div className="relative ml-auto w-[92px]">
      <input
        data-cell={`${rowIndex}:${field}`}
        inputMode="decimal"
        value={value}
        disabled={disabled}
        placeholder={disabled ? "—" : "0"}
        onChange={(e) => onChange(row.user_id, field, e.target.value.replace(/[^\d.,]/g, ""))}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "ArrowDown") {
            e.preventDefault();
            onNavigate(rowIndex + 1, field);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            onNavigate(rowIndex - 1, field);
          }
        }}
        aria-label={`${field === "actual_days" ? "Ngày công" : "Giờ OT"} của ${row.full_name}`}
        aria-invalid={Boolean(error) || undefined}
        title={error || undefined}
        className={cn(
          "h-8 w-full rounded-lg border bg-background pr-8 pl-2.5 text-right text-[13.5px] tabular-nums outline-none transition-[border-color,box-shadow,background-color]",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:text-muted-foreground",
          dirty ? "border-primary/50 bg-primary/[0.04]" : "border-input",
          error && "border-destructive bg-destructive/5 focus-visible:ring-destructive/15",
        )}
      />
      <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[11px] text-muted-foreground">{suffix}</span>
    </div>
  );
}

function RowState({ row, dirty, error }) {
  if (error) return <Badge variant="destructive">Lỗi</Badge>;
  if (row.base_salary === null) return <Badge variant="outline" className="text-muted-foreground">Thiếu HĐ</Badge>;
  if (dirty) return <Badge className="bg-primary/12 text-primary"><Pencil /> Đã sửa</Badge>;
  if (row.payroll_item_id) return <Badge variant="success"><Check /> Đã nhập</Badge>;
  return <Badge variant="warning"><CircleDashed /> Chưa nhập</Badge>;
}

function PayrollHistoryDialog({ period, row, onClose }) {
  const historyQuery = useQuery({
    queryKey: ["payroll", "changes", period.id, row.user_id],
    queryFn: () => api.payrollChanges(period.id, row.user_id),
  });
  const history = historyQuery.data ?? [];
  const amount = (value) => value === null || value === undefined ? "—" : formatMoney(value);
  const number = (value) => value === null || value === undefined ? "—" : formatNumber(value);
  const dateTime = (value) => new Date(String(value).replace(" ", "T")).toLocaleString("vi-VN");
  const labels = {
    INITIAL_CALCULATION: "Tính lương lần đầu",
    INPUT_UPDATE: "Cập nhật OT",
    RECALCULATION: "Tính lại lương",
  };
  const valuePairs = [
    ["Ngày công", "previous_actual_days", "actual_days", number],
    ["Giờ OT", "previous_ot_hours", "ot_hours", number],
    ["Gross", "previous_gross_salary", "gross_salary", amount],
    ["BHXH", "previous_social_insurance", "social_insurance", amount],
    ["Giảm trừ", "previous_tax_deduction", "tax_deduction", amount],
    ["Thuế TNCN", "previous_personal_tax", "personal_tax", amount],
    ["Net", "previous_net_salary", "net_salary", amount],
  ];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lịch sử thay đổi lương</DialogTitle>
          <DialogDescription>{row.full_name} · {row.employee_code} · {formatPeriod(period.month_year)}</DialogDescription>
        </DialogHeader>
        {historyQuery.isPending ? (
          <LoadingState rows={2} />
        ) : historyQuery.error ? (
          <ErrorState error={historyQuery.error} onRetry={() => historyQuery.refetch()} />
        ) : history.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-muted-foreground">Chưa có nhật ký thay đổi cho kỳ lương này.</p>
        ) : (
          <ol className="grid gap-3">
            {history.map((entry) => (
              <li key={entry.id} className="grid gap-3 rounded-xl border border-border/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{labels[entry.change_type] ?? "Thay đổi lương"}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {entry.changed_by_name || "Người thao tác không còn trong hệ thống"} · {dateTime(entry.created_at)}
                    </p>
                  </div>
                </div>
                <p className="whitespace-pre-wrap rounded-lg bg-muted/60 px-3 py-2 text-[13px]">{entry.reason}</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                  {valuePairs.map(([label, beforeKey, afterKey, format]) => (
                    <div key={label}>
                      <dt className="text-[11px] text-muted-foreground">{label}</dt>
                      <dd className="text-[12px] tabular-nums">{format(entry[beforeKey])} → {format(entry[afterKey])}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AttendanceGrid({ period, rows, onDirtyChange }) {
  const queryClient = useQueryClient();
  const editable = period.status === "DRAFT";
  const maxOt = daysInMonthOf(period.month_year) * 24;

  const [drafts, setDrafts] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [filter, setFilter] = useState("all");
  const [historyRow, setHistoryRow] = useState(null);

  const original = useCallback(
    (row, field) => (row.payroll_item_id ? toInput(row[field]) : ""),
    [],
  );
  const valueOf = useCallback(
    (row, field) => drafts[row.user_id]?.[field] ?? original(row, field),
    [drafts, original],
  );
  const isDirty = useCallback(
    (row) => FIELDS.some((f) => drafts[row.user_id]?.[f] !== undefined && drafts[row.user_id][f] !== original(row, f)),
    [drafts, original],
  );

  const validate = useCallback(
    (row) => {
      if (!isDirty(row)) return null;
      const ot = valueOf(row, "ot_hours");
      const o = ot === "" ? 0 : parseNum(ot);
      if (!Number.isFinite(o) || o < 0) return "Giờ OT phải là số không âm";
      if (o > maxOt) return `Giờ OT tối đa ${maxOt}`;
      const reason = String(drafts[row.user_id]?.reason ?? "").trim();
      if (reason.length < 10 || reason.length > 500) return "Lý do cần cụ thể, từ 10 đến 500 ký tự";
      return null;
    },
    [isDirty, valueOf, maxOt, drafts],
  );

  const dirtyRows = useMemo(() => rows.filter(isDirty), [rows, isDirty]);
  const invalid = useMemo(() => dirtyRows.filter((r) => validate(r)), [dirtyRows, validate]);

  useEffect(() => onDirtyChange?.(dirtyRows.length), [dirtyRows.length, onDirtyChange]);
  useEffect(() => {
    if (!dirtyRows.length) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirtyRows.length]);

  const departments = useMemo(() => [...new Set(rows.map((r) => r.department).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi")), [rows]);
  const counts = useMemo(
    () => ({
      all: rows.length,
      pending: rows.filter((r) => !r.payroll_item_id && r.base_salary !== null).length,
      done: rows.filter((r) => r.payroll_item_id).length,
      dirty: dirtyRows.length,
    }),
    [rows, dirtyRows.length],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (department !== "all" && r.department !== department) return false;
      if (filter === "pending" && (r.payroll_item_id || r.base_salary === null)) return false;
      if (filter === "done" && !r.payroll_item_id) return false;
      if (filter === "dirty" && !isDirty(r)) return false;
      if (!q) return true;
      return [r.full_name, r.employee_code, r.department].some((v) => String(v ?? "").toLowerCase().includes(q));
    });
  }, [rows, query, department, filter, isDirty]);

  const change = useCallback((userId, field, value) => {
    setDrafts((d) => ({ ...d, [userId]: { ...d[userId], [field]: value } }));
    setServerErrors((e) => {
      if (!e[userId]) return e;
      const next = { ...e };
      delete next[userId];
      return next;
    });
  }, []);

  const navigate = useCallback((rowIndex, field) => {
    const el = document.querySelector(`[data-cell="${rowIndex}:${field}"]`);
    if (el && !el.disabled) el.focus();
  }, []);

  const reset = () => {
    setDrafts({});
    setServerErrors({});
  };

  const mutation = useMutation({
    mutationFn: (entries) => api.saveAttendance(period.id, entries),
    onSuccess: (data, entries) => {
      queryClient.setQueryData(["payroll", "attendance", period.id], (old) => ({
        period: data?.period ?? old?.period ?? period,
        items: data?.items ?? old?.items ?? [],
      }));
      queryClient.invalidateQueries({ queryKey: ["payroll", "periods"] });
      setDrafts({});
      setServerErrors({});
      toast.success(`Đã lưu và tính lương cho ${data?.updated_count ?? entries.length} nhân viên`);
    },
    onError: (err, entries) => {
      const d = err.details ?? {};
      const ids = new Set(d.user_ids ?? []);
      if (Number.isInteger(d.entry_index) && entries[d.entry_index]) ids.add(entries[d.entry_index].user_id);
      setServerErrors(Object.fromEntries([...ids].map((id) => [id, err.message])));
      toast.error(err.message);
    },
  });

  const save = () => {
    if (invalid.length) {
      toast.error(`Còn ${invalid.length} dòng chưa hợp lệ — kiểm tra các ô viền đỏ`);
      const firstInvalid = invalid[0];
      if (validate(firstInvalid) === "Lý do cần cụ thể, từ 10 đến 500 ký tự") {
        document.querySelector(`[data-reason="${firstInvalid.user_id}"]`)?.focus();
      } else {
        navigate(visible.findIndex((row) => row.user_id === firstInvalid.user_id), "ot_hours");
      }
      return;
    }
    mutation.mutate(
      dirtyRows.map((r) => ({
        user_id: r.user_id,
        ot_hours: valueOf(r, "ot_hours") === "" ? 0 : parseNum(valueOf(r, "ot_hours")),
        reason: drafts[r.user_id]?.reason ?? "",
      })),
    );
  };

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="gap-1 border-b border-border/70 px-4 py-4 sm:px-5 [.border-b]:pb-4">
        <CardTitle>Lưới ngày công & OT</CardTitle>
        <CardDescription>
          {editable
            ? `Ngày công lấy từ chấm công theo ngày · chỉ nhập OT trên lưới · tối đa ${maxOt} giờ OT`
            : "Kỳ lương đã chốt — chỉ xem, không thể chỉnh sửa"}
        </CardDescription>
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
          label="Lọc trạng thái nhập"
          className="lg:ml-auto"
          options={[
            { value: "all", label: "Tất cả", count: counts.all },
            { value: "pending", label: "Chưa nhập", count: counts.pending },
            { value: "done", label: "Đã nhập", count: counts.done },
            ...(editable ? [{ value: "dirty", label: "Đã sửa", count: counts.dirty }] : []),
          ]}
        />
      </div>

      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4 sm:pl-5">Nhân viên</TableHead>
              <TableHead className="text-right max-md:hidden">Lương CB</TableHead>
              <TableHead className="text-right">Ngày công</TableHead>
              <TableHead className="text-right">Giờ OT</TableHead>
              <TableHead className="min-w-[220px]">Lý do thay đổi</TableHead>
              <TableHead className="text-right max-lg:hidden">Gross</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead className="pr-4 sm:pr-5">Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="py-12 text-center text-[13px] text-muted-foreground">
                  Không có nhân viên phù hợp bộ lọc.
                </TableCell>
              </TableRow>
            )}
            {visible.map((r, i) => {
              const dirty = isDirty(r);
              const error = serverErrors[r.user_id] || validate(r);
              const disabled = !editable || r.base_salary === null;
              return (
                <TableRow key={r.user_id} className={cn(dirty && "bg-primary/[0.025]", error && "bg-destructive/[0.03]")}>
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
                  <TableCell className="text-right text-[13px] tabular-nums text-muted-foreground max-md:hidden">
                    {r.base_salary === null ? "—" : formatMoneyShort(r.base_salary)}
                  </TableCell>
                  <TableCell className="text-right text-[13px] tabular-nums">
                    <span aria-label={`Ngày công của ${r.full_name}`}>{formatNumber(r.actual_days)}</span>
                  </TableCell>
                  {FIELDS.map((f) => (
                    <TableCell key={f} className="py-1.5">
                      <CellInput
                        row={r}
                        field={f}
                        rowIndex={i}
                        value={valueOf(r, f)}
                        dirty={drafts[r.user_id]?.[f] !== undefined && drafts[r.user_id][f] !== original(r, f)}
                        error={error}
                        disabled={disabled}
                        onChange={change}
                        onNavigate={navigate}
                        suffix="giờ"
                      />
                    </TableCell>
                  ))}
                  <TableCell className="py-1.5">
                    <Textarea
                      data-reason={r.user_id}
                      value={drafts[r.user_id]?.reason ?? ""}
                      onChange={(e) => change(r.user_id, "reason", e.target.value)}
                      disabled={disabled}
                      maxLength={500}
                      rows={2}
                      aria-label={`Lý do thay đổi lương của ${r.full_name}`}
                      aria-invalid={Boolean(error) || undefined}
                      placeholder="Ghi rõ lý do (10–500 ký tự)"
                      className="min-h-16 min-w-[210px] resize-y text-[12px]"
                    />
                  </TableCell>
                  <TableCell className="text-right text-[13px] tabular-nums max-lg:hidden">
                    {dirty ? <span className="text-muted-foreground">—</span> : r.payroll_item_id ? formatMoney(r.gross_salary) : "—"}
                  </TableCell>
                  <TableCell className="text-right text-[13px] font-medium tabular-nums">
                    {dirty ? (
                      <span className="text-[12px] font-normal text-muted-foreground">tính khi lưu</span>
                    ) : r.payroll_item_id ? (
                      formatMoney(r.net_salary)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="pr-4 sm:pr-5" title={error || undefined}>
                    <div className="flex items-center gap-1">
                      <RowState row={r} dirty={dirty} error={error} />
                      {r.payroll_item_id && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Xem lịch sử lương của ${r.full_name}`}
                          onClick={() => setHistoryRow(r)}
                        >
                          <History />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>

      {/* Thanh lưu nổi — chỉ hiện khi có thay đổi */}
      <AnimatePresence>
        {dirtyRows.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="sticky bottom-4 z-20 mx-3 mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-border/80 bg-card/90 px-4 py-2.5 shadow-popover backdrop-blur-xl"
          >
            <span className="flex items-center gap-2 text-[13px]">
              <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
              <b className="font-semibold tabular-nums">{dirtyRows.length}</b> thay đổi chưa lưu
              {invalid.length > 0 && <span className="text-destructive">· {invalid.length} dòng lỗi</span>}
            </span>
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="sm" onClick={reset} disabled={mutation.isPending}>
                <RotateCcw /> Hoàn tác
              </Button>
              <Button size="sm" onClick={save} disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}
                Lưu thay đổi ({dirtyRows.length})
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {historyRow && (
        <PayrollHistoryDialog period={period} row={historyRow} onClose={() => setHistoryRow(null)} />
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */

export default function AttendancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [dirtyCount, setDirtyCount] = useState(0);

  const periodsQuery = useQuery({ queryKey: ["payroll", "periods"], queryFn: api.payrollPeriods });
  const periods = useMemo(() => periodsQuery.data ?? [], [periodsQuery.data]);
  const requested = Number(searchParams.get("ky"));
  const period =
    periods.find((p) => p.id === requested) ?? periods.find((p) => p.status === "DRAFT") ?? periods[0] ?? null;

  const attendanceQuery = useQuery({
    queryKey: ["payroll", "attendance", period?.id],
    queryFn: () => api.payrollAttendance(period.id),
    enabled: Boolean(period),
  });
  const rows = useMemo(() => attendanceQuery.data?.items ?? [], [attendanceQuery.data]);
  const livePeriod = attendanceQuery.data?.period ? { ...period, ...attendanceQuery.data.period } : period;

  const stats = useMemo(() => {
    const entered = rows.filter((r) => r.payroll_item_id);
    return {
      eligible: rows.filter((r) => r.base_salary !== null).length,
      missing: rows.filter((r) => r.base_salary === null).length,
      entered: entered.length,
      days: entered.reduce((s, r) => s + (r.actual_days || 0), 0),
      ot: entered.reduce((s, r) => s + (r.ot_hours || 0), 0),
      net: entered.reduce((s, r) => s + (r.net_salary || 0), 0),
      gross: entered.reduce((s, r) => s + (r.gross_salary || 0), 0),
    };
  }, [rows]);

  const selectPeriod = (id) => {
    if (String(id) === String(period?.id)) return;
    if (dirtyCount > 0 && !window.confirm(`Có ${dirtyCount} thay đổi chưa lưu. Chuyển kỳ sẽ bỏ các thay đổi này?`)) return;
    setSearchParams({ ky: String(id) });
  };

  const editable = livePeriod?.status === "DRAFT";

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <Reveal offset={8}>
          <div className="space-y-1">
            <p className="text-eyebrow">Tiền lương</p>
            <h1 className="page-title">Chấm công & OT</h1>
            <p className="text-[14px] text-muted-foreground">Ngày công được tính từ chấm công từng ngày; nhập OT theo kỳ để tính lương.</p>
          </div>
        </Reveal>
        <Reveal delay={80} offset={8}>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
              <CalendarPlus /> Tạo kỳ lương
            </Button>
            <Button
              size="sm"
              onClick={() => setImportOpen(true)}
              disabled={!period || !editable || dirtyCount > 0}
              title={dirtyCount > 0 ? "Lưu hoặc hoàn tác thay đổi trên lưới trước khi import" : !editable ? "Chỉ import được cho kỳ Nháp" : undefined}
            >
              <FileSpreadsheet /> Import Excel
            </Button>
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
              <p className="max-w-sm text-[14px] text-muted-foreground">Tạo kỳ lương đầu tiên (Tháng/Năm) để nhập OT. Ngày công lấy từ chấm công theo ngày.</p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <CalendarPlus /> Tạo kỳ lương mới
            </Button>
          </Card>
        </Reveal>
      ) : (
        <>
          {/* Chọn kỳ + tiến trình */}
          <Reveal delay={60} offset={12}>
            <Card className="gap-5 py-5">
              <CardHeader className="px-5 sm:grid-cols-[1fr_auto]">
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={String(period.id)} onValueChange={selectPeriod}>
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
                    Công chuẩn <b className="font-medium text-foreground tabular-nums">{livePeriod.standard_days}</b> ngày ·{" "}
                    {daysInMonthOf(livePeriod.month_year)} ngày trong tháng
                  </span>
                </div>
                {!editable && (
                  <CardAction className="max-sm:col-start-1 max-sm:row-start-3">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-[12.5px] text-muted-foreground">
                      <Lock className="size-3.5" /> Chỉ xem
                    </span>
                  </CardAction>
                )}
              </CardHeader>
              <CardContent className="px-5">
                <Stepper period={livePeriod} entered={stats.entered} eligible={stats.eligible} />
              </CardContent>
            </Card>
          </Reveal>

          <section aria-label="Thống kê kỳ" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                icon: CalendarCheck2,
                label: "Đã nhập OT",
                value: (
                  <>
                    {stats.entered}
                    <span className="text-[15px] text-muted-foreground">/{stats.eligible}</span>
                  </>
                ),
                hint: stats.missing ? `${stats.missing} nhân viên chưa có hợp đồng` : "Tất cả đều có hợp đồng",
              },
              { icon: Sigma, label: "Tổng ngày công", value: formatNumber(stats.days), hint: "Theo dữ liệu chấm công từng ngày" },
              { icon: Clock, label: "Tổng giờ OT", value: `${formatNumber(stats.ot)} giờ`, hint: "Hệ số OT ×1,5" },
              { icon: Wallet, label: "Net tạm tính", value: formatMoneyShort(stats.net), hint: `Gross ${formatMoneyShort(stats.gross)}` },
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
              <AttendanceGrid key={period.id} period={livePeriod} rows={rows} onDirtyChange={setDirtyCount} />
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
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} period={livePeriod} />
    </div>
  );
}
