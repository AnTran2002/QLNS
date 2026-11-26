import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Check, Loader2 } from "lucide-react";
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
import { api } from "@/lib/api";
import { formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Số ngày làm việc (T2–T6) của tháng `YYYY-MM` — khớp AttendanceService::weekdaysInMonth. */
export function weekdaysInMonth(monthYear) {
  const [y, m] = String(monthYear ?? "").split("-").map(Number);
  if (!y || !m) return 0;
  const days = new Date(y, m, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const wd = new Date(y, m - 1, d).getDay();
    if (wd !== 0 && wd !== 6) count += 1;
  }
  return count;
}

export const daysInMonthOf = (monthYear) => {
  const [y, m] = String(monthYear ?? "").split("-").map(Number);
  return y && m ? new Date(y, m, 0).getDate() : 31;
};

/** Chỉ được tạo kỳ cho tháng hiện tại hoặc tháng kế tiếp (Back-End chặn tháng đã qua). */
export function allowedPeriodMonths(today = new Date()) {
  const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return [
    { monthYear: key(today), label: "Tháng hiện tại" },
    { monthYear: key(new Date(today.getFullYear(), today.getMonth() + 1, 1)), label: "Tháng kế tiếp" },
  ];
}

/* ------------------------------------------------------------------ */
/* Tạo Kỳ lương mới                                                    */
/* ------------------------------------------------------------------ */

function CreatePeriodForm({ periods, onCreated, onCancel }) {
  const queryClient = useQueryClient();
  const options = useMemo(
    () => allowedPeriodMonths().map((o) => ({ ...o, taken: periods.some((p) => p.month_year === o.monthYear) })),
    [periods],
  );
  const [monthYear, setMonthYear] = useState(() => options.find((o) => !o.taken)?.monthYear ?? null);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.createPayrollPeriod({ month_year: monthYear }),
    onSuccess: (period) => {
      queryClient.invalidateQueries({ queryKey: ["payroll", "periods"] });
      toast.success(`Đã tạo kỳ lương ${formatPeriod(monthYear)}`);
      onCreated?.(period);
    },
    onError: (err) => setError(err.message),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!monthYear) return setError("Tháng hiện tại và tháng kế tiếp đều đã có kỳ lương.");
    setError("");
    mutation.mutate();
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">Chọn tháng</legend>
        {options.map((o) => {
          const selected = o.monthYear === monthYear;
          return (
            <button
              key={o.monthYear}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={o.taken}
              onClick={() => {
                setMonthYear(o.monthYear);
                setError("");
              }}
              className={cn(
                "relative grid gap-1 rounded-xl border px-4 py-3 text-left transition-colors",
                "focus-visible:ring-3 focus-visible:ring-ring/15 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55",
                selected ? "border-primary bg-primary/[0.05]" : "border-border hover:border-primary/40",
              )}
            >
              <span className="text-[12px] text-muted-foreground">{o.label}</span>
              <span className="text-[15px] font-semibold">{formatPeriod(o.monthYear)}</span>
              <span className="text-[12px] text-muted-foreground">
                {o.taken ? "Đã có kỳ lương" : `${weekdaysInMonth(o.monthYear)} ngày công chuẩn`}
              </span>
              {selected && <Check className="absolute top-3 right-3 size-4 text-primary" aria-hidden="true" />}
            </button>
          );
        })}
      </fieldset>

      <div className="rounded-xl border border-border/70 bg-muted/50 px-4 py-3 text-[13px] text-muted-foreground">
        Không tạo được kỳ cho tháng đã qua. Công chuẩn = số ngày T2–T6 trong tháng; ngày công & giờ OT được
        tổng hợp <b className="font-medium text-foreground">tự động</b> từ chấm công hằng ngày.
      </div>

      <FormError message={error} />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Huỷ
        </Button>
        <Button type="submit" disabled={mutation.isPending || !monthYear}>
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
          <DialogDescription>Kỳ mới ở trạng thái Nháp; số liệu công được đồng bộ từ chấm công.</DialogDescription>
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
