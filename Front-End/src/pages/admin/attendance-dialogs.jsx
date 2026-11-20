import { useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, CalendarPlus, FileSpreadsheet, Loader2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/animate-ui/components/buttons/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/animate-ui/components/radix/dialog";
import { FormError } from "@/components/app/kit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Số ngày làm việc (Thứ 2 – Thứ 6) trong tháng — gợi ý cho "công chuẩn". */
function weekdaysIn(year, month) {
  const days = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const wd = new Date(year, month - 1, d).getDay();
    if (wd !== 0 && wd !== 6) count += 1;
  }
  return count;
}

export const daysInMonthOf = (monthYear) => {
  const [y, m] = String(monthYear ?? "").split("-").map(Number);
  return y && m ? new Date(y, m, 0).getDate() : 31;
};

/** Tháng kế tiếp sau kỳ mới nhất (hoặc tháng hiện tại nếu chưa có kỳ nào). */
function suggestNext(periods) {
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth() + 1;
  const existing = new Set(periods.map((p) => p.month_year));
  const key = () => `${y}-${String(m).padStart(2, "0")}`;
  let guard = 0;
  while (existing.has(key()) && guard++ < 36) {
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return { year: y, month: m };
}

/* ------------------------------------------------------------------ */
/* <<use>> Tạo Kỳ lương mới (Tháng/Năm)                                */
/* ------------------------------------------------------------------ */

function CreatePeriodForm({ periods, onCreated, onCancel }) {
  const queryClient = useQueryClient();
  const initial = useMemo(() => suggestNext(periods), [periods]);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [standardDays, setStandardDays] = useState(String(weekdaysIn(initial.year, initial.month)));
  const [touchedDays, setTouchedDays] = useState(false);
  const [error, setError] = useState("");

  const monthYear = `${year}-${String(month).padStart(2, "0")}`;
  const exists = periods.some((p) => p.month_year === monthYear);
  const maxDays = new Date(year, month, 0).getDate();
  const suggested = weekdaysIn(year, month);
  const thisYear = new Date().getFullYear();
  const years = [thisYear - 1, thisYear, thisYear + 1];

  const pick = (y, m) => {
    setYear(y);
    setMonth(m);
    setError("");
    if (!touchedDays) setStandardDays(String(weekdaysIn(y, m)));
  };

  const mutation = useMutation({
    mutationFn: () => api.createPayrollPeriod({ month_year: monthYear, standard_days: Number(standardDays) }),
    onSuccess: (period) => {
      queryClient.invalidateQueries({ queryKey: ["payroll", "periods"] });
      toast.success(`Đã tạo kỳ lương ${formatPeriod(monthYear)}`);
      onCreated?.(period);
    },
    onError: (err) => setError(err.status === 409 ? `Kỳ lương ${formatPeriod(monthYear)} đã tồn tại.` : err.message),
  });

  const submit = (e) => {
    e.preventDefault();
    const n = Number(standardDays);
    if (!Number.isInteger(n) || n < 1 || n > Math.min(31, maxDays)) {
      setError(`Công chuẩn phải là số nguyên từ 1 đến ${maxDays}.`);
      return;
    }
    if (exists) {
      setError(`Kỳ lương ${formatPeriod(monthYear)} đã tồn tại.`);
      return;
    }
    mutation.mutate();
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="period-month">Tháng</Label>
          <Select value={String(month)} onValueChange={(v) => pick(year, Number(v))}>
            <SelectTrigger id="period-month" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const taken = periods.some((p) => p.month_year === `${year}-${String(m).padStart(2, "0")}`);
                return (
                  <SelectItem key={m} value={String(m)}>
                    Tháng {m}
                    {taken ? " · đã có" : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="period-year">Năm</Label>
          <Select value={String(year)} onValueChange={(v) => pick(Number(v), month)}>
            <SelectTrigger id="period-year" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="standard-days">Số ngày công chuẩn</Label>
        <div className="relative">
          <Input
            id="standard-days"
            inputMode="numeric"
            value={standardDays}
            onChange={(e) => {
              setTouchedDays(true);
              setStandardDays(e.target.value.replace(/[^\d]/g, ""));
              setError("");
            }}
            className="pr-16 tabular-nums"
          />
          <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[13px] text-muted-foreground">ngày</span>
        </div>
        <p className="text-[12.5px] text-muted-foreground">
          Gợi ý: {formatPeriod(monthYear)} có <b className="font-medium text-foreground">{suggested}</b> ngày làm việc (T2–T6), tổng {maxDays} ngày.
          {touchedDays && Number(standardDays) !== suggested && (
            <button
              type="button"
              className="ml-1 text-primary hover:underline"
              onClick={() => {
                setStandardDays(String(suggested));
                setTouchedDays(false);
              }}
            >
              Dùng {suggested}
            </button>
          )}
        </p>
      </div>

      <div className="rounded-xl border border-border/70 bg-muted/50 px-4 py-3 text-[13px]">
        <p className="text-muted-foreground">Kỳ mới sẽ được tạo với</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-semibold text-foreground">{formatPeriod(monthYear)}</span>
          <span className="font-mono text-[12px] text-muted-foreground">month_year = {monthYear}</span>
          <span className="rounded-md bg-warning/12 px-1.5 py-px text-[12px] font-medium text-warning">DRAFT</span>
        </p>
        {exists && (
          <p className="mt-2 flex items-center gap-1.5 text-destructive">
            <AlertTriangle className="size-3.5" /> Tháng này đã có kỳ lương — chọn tháng khác.
          </p>
        )}
      </div>

      <FormError message={error} />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Huỷ
        </Button>
        <Button type="submit" disabled={mutation.isPending || exists}>
          {mutation.isPending ? <Loader2 className="animate-spin" /> : <CalendarPlus />}
          Tạo kỳ lương
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CreatePeriodDialog({ open, onOpenChange, periods, onCreated }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo kỳ lương mới</DialogTitle>
          <DialogDescription>Chọn Tháng/Năm. Kỳ mới ở trạng thái Nháp để bắt đầu nhập ngày công & OT.</DialogDescription>
        </DialogHeader>
        {open && (
          <CreatePeriodForm
            periods={periods}
            onCancel={() => onOpenChange(false)}
            onCreated={(p) => {
              onOpenChange(false);
              onCreated?.(p);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* <<extend>> Import file Excel công (.xlsx)                           */
/* ------------------------------------------------------------------ */

const MAX_SIZE = 10 * 1024 * 1024;
const formatSize = (b) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Gom các dạng lỗi Back-End trả về (errors / unknown_employees / employee_codes / row_numbers). */
function importProblems(details) {
  if (!details || typeof details !== "object") return [];
  const out = [];
  for (const e of details.errors ?? []) out.push({ row: e.row_number, text: e.message });
  for (const u of details.unknown_employees ?? []) out.push({ row: u.row_number, text: `Mã "${u.employee_code}" không tồn tại` });
  if (details.employee_codes?.length) {
    out.push({ row: null, text: `Chưa có hợp đồng: ${details.employee_codes.join(", ")}` });
  }
  if (details.row_numbers?.length && !details.employee_codes?.length) {
    out.push({ row: null, text: `Các dòng: ${details.row_numbers.join(", ")}` });
  }
  if (details.row_number && !out.length) out.push({ row: details.row_number, text: "Giá trị vượt giới hạn" });
  return out;
}

function ImportForm({ period, onDone, onCancel }) {
  const queryClient = useQueryClient();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);

  const choose = (f) => {
    setError(null);
    if (!f) return;
    if (!/\.xlsx$/i.test(f.name)) {
      setError({ message: "Chỉ nhận file Excel định dạng .xlsx." });
      return;
    }
    if (f.size > MAX_SIZE) {
      setError({ message: "File vượt quá 10 MB." });
      return;
    }
    setFile(f);
  };

  const mutation = useMutation({
    mutationFn: () => api.importAttendance(period.id, file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
      toast.success(`Đã nhập ${data?.imported_count ?? data?.updated_count ?? 0} dòng công từ ${file.name}`);
      onDone?.(data);
    },
    onError: (err) => setError({ message: err.message, problems: importProblems(err.details) }),
  });

  return (
    <div className="grid gap-5">
      <label
        htmlFor="xlsx-file"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          choose(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50",
        )}
      >
        <motion.span
          animate={dragging ? { y: -4, scale: 1.06 } : { y: 0, scale: 1 }}
          className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"
        >
          <UploadCloud className="size-5" />
        </motion.span>
        <span className="text-[14px] font-medium">Kéo thả file vào đây hoặc bấm để chọn</span>
        <span className="text-[12.5px] text-muted-foreground">.xlsx · tối đa 10 MB · sheet đầu tiên</span>
        <input
          ref={inputRef}
          id="xlsx-file"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(e) => {
            choose(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>

      <AnimatePresence initial={false}>
        {file && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-card px-3 py-2.5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-success/12 text-success">
                <FileSpreadsheet className="size-4.5" />
              </span>
              <span className="grid min-w-0 flex-1">
                <span className="truncate text-[13.5px] font-medium">{file.name}</span>
                <span className="text-[12px] text-muted-foreground">{formatSize(file.size)}</span>
              </span>
              <Button variant="ghost" size="icon-sm" onClick={() => setFile(null)} aria-label="Bỏ chọn file">
                <X />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        <p className="text-[13px] font-medium">Cấu trúc cột (dòng 1 là tiêu đề)</p>
        <div className="overflow-hidden rounded-xl border border-border/80 text-[12.5px]">
          <table className="w-full">
            <thead className="bg-muted/60 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Mã nhân viên</th>
                <th className="px-3 py-2 font-medium">Ngày công</th>
                <th className="px-3 py-2 font-medium">Giờ OT</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              <tr className="border-t border-border/60">
                <td className="px-3 py-1.5">NV002</td>
                <td className="px-3 py-1.5">22</td>
                <td className="px-3 py-1.5">4</td>
              </tr>
              <tr className="border-t border-border/60">
                <td className="px-3 py-1.5">NV003</td>
                <td className="px-3 py-1.5">20.5</td>
                <td className="px-3 py-1.5">0</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[12px] text-muted-foreground">
          Tên cột chấp nhận: <span className="font-mono">employee_code / Mã NV</span>, <span className="font-mono">actual_days / Số ngày công</span>,{" "}
          <span className="font-mono">ot_hours / Số giờ OT</span>. Dòng trùng mã sẽ bị từ chối.
        </p>
      </div>

      {error && (
        <div role="alert" className="space-y-2 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-[13px]">
          <p className="flex items-center gap-1.5 font-medium text-destructive">
            <AlertTriangle className="size-4" /> {error.message}
          </p>
          {error.problems?.length > 0 && (
            <ul className="max-h-36 space-y-1 overflow-y-auto text-foreground/80">
              {error.problems.slice(0, 20).map((p, i) => (
                <li key={i} className="flex gap-2">
                  {p.row && <span className="shrink-0 font-mono text-muted-foreground">Dòng {p.row}</span>}
                  <span>{p.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Huỷ
        </Button>
        <Button onClick={() => mutation.mutate()} disabled={!file || mutation.isPending}>
          {mutation.isPending ? <Loader2 className="animate-spin" /> : <UploadCloud />}
          {mutation.isPending ? "Đang nhập…" : "Nhập dữ liệu"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function ImportDialog({ open, onOpenChange, period, onDone }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import file Excel công</DialogTitle>
          <DialogDescription>
            {period ? `Ghi đè ngày công & giờ OT của ${formatPeriod(period.month_year)} cho các nhân viên có trong file.` : ""}
          </DialogDescription>
        </DialogHeader>
        {open && period && (
          <ImportForm
            period={period}
            onCancel={() => onOpenChange(false)}
            onDone={(d) => {
              onOpenChange(false);
              onDone?.(d);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
