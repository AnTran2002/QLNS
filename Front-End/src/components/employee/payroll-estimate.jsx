import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calculator, Info, TrendingUp } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/animate-ui/components/radix/dialog";
import { PeriodStatusBadge, Segmented } from "@/components/app/kit";
import { PayoutBar, PayslipBreakdown } from "@/components/app/payslip";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatDate, formatMoney, formatNumber, formatPeriod } from "@/lib/format";

/** Lương tạm tính theo tiến trình chấm công (employee/payroll-estimate) — đến hôm nay và dự kiến cả tháng. */
export function PayrollEstimateCard({ month }) {
  const { data, isPending, error } = useQuery({
    queryKey: ["payroll-estimate", month],
    queryFn: () => api.payrollEstimate(month),
    refetchInterval: 5 * 60_000,
  });
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("to_date");

  if (isPending) return <Skeleton className="h-64 rounded-[22px]" />;
  if (error) {
    return (
      <Card className="h-full gap-3">
        <CardHeader>
          <CardTitle>Lương tạm tính {formatPeriod(month)}</CardTitle>
          <CardDescription>{error.message}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const toDate = data.to_date ?? {};
  const projection = data.projection ?? {};
  const pct = data.standard_days ? (data.worked_days / data.standard_days) * 100 : 0;
  const shown = view === "to_date" ? toDate : projection;

  return (
    <Card className="h-full gap-5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="size-4.5 text-primary" /> Lương tạm tính {formatPeriod(data.month).toLowerCase()}
        </CardTitle>
        <CardDescription>
          Tự cập nhật theo chấm công đến {formatDate(data.through_date)} · {formatNumber(data.standard_days)} ngày công chuẩn
          {data.standard_days_source === "period" ? " (theo kỳ lương)" : " (tính theo lịch)"}
        </CardDescription>
        {data.period && (
          <CardAction>
            <PeriodStatusBadge status={data.period.status} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[12px] text-muted-foreground">Thực nhận đến hôm nay</p>
              <p className="font-display text-[26px] font-semibold tracking-[-0.03em] tabular-nums">{formatMoney(toDate.net_salary)}</p>
              <p className="text-[12px] text-muted-foreground tabular-nums">Gross {formatMoney(toDate.gross_salary)}</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-[12px] text-muted-foreground">
                <TrendingUp className="size-3.5" /> Dự kiến cả tháng
              </p>
              <p className="font-display text-[26px] font-semibold tracking-[-0.03em] text-primary tabular-nums">{formatMoney(projection.net_salary)}</p>
              <p className="text-[12px] text-muted-foreground tabular-nums">
                nếu đi làm đủ {formatNumber(projection.assumed_extra_days)} ngày còn lại
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Meter value={pct} label="Ngày công đã làm trong tháng" />
            <p className="text-[12px] text-muted-foreground tabular-nums">
              {formatNumber(data.worked_days)}/{formatNumber(data.standard_days)} ngày công · còn {formatNumber(data.remaining_workdays)} ngày làm việc ·{" "}
              {formatNumber(data.ot_hours)} giờ OT
            </p>
          </div>
        </div>
        <div className="grid content-start gap-3">
          <Segmented
            value={view}
            onValueChange={setView}
            label="Xem số liệu"
            options={[
              { value: "to_date", label: "Đến hôm nay" },
              { value: "projection", label: "Dự kiến" },
            ]}
          />
          <PayoutBar item={shown} />
          <dl className="grid grid-cols-2 gap-2 text-[13px]">
            {[
              ["Bảo hiểm (NLĐ đóng)", formatMoney(shown.social_insurance)],
              ["Thuế TNCN", formatMoney(shown.personal_tax)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-muted/50 px-3 py-2">
                <dt className="text-[11.5px] text-muted-foreground">{k}</dt>
                <dd className="font-medium tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </CardContent>
      <CardFooter className="flex-wrap justify-between gap-2">
        <p className="flex items-start gap-1.5 text-[12px] text-muted-foreground">
          <Info className="mt-px size-3.5 shrink-0" /> Số tạm tính — phiếu lương chính thức do nhân sự chốt cuối kỳ.
        </p>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Calculator /> Xem cách tính
        </Button>
      </CardFooter>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cách tính lương {formatPeriod(data.month).toLowerCase()}</DialogTitle>
            <DialogDescription>
              {view === "to_date"
                ? `Theo chấm công thực tế đến ${formatDate(data.through_date)}`
                : `Dự kiến nếu đi làm đủ ${formatNumber(projection.assumed_extra_days)} ngày còn lại`}
            </DialogDescription>
          </DialogHeader>
          <Segmented
            value={view}
            onValueChange={setView}
            label="Chọn số liệu"
            options={[
              { value: "to_date", label: "Đến hôm nay" },
              { value: "projection", label: "Dự kiến cả tháng" },
            ]}
          />
          <PayslipBreakdown item={shown} />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
