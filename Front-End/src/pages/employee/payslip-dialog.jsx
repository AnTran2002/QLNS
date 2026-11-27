import { Download, Info, Printer } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/animate-ui/components/radix/dialog";
import { PeriodStatusBadge } from "@/components/app/kit";
import { PayslipBreakdown, PayslipHeader } from "@/components/app/payslip";
import { payslipDownloadUrl } from "@/lib/api";

/** Kỳ đã chốt (LOCKED/PAID) mới có phiếu lương phát hành — khớp PayrollModel::getPublishedPayslip. */
export const isPublished = (status) => status === "LOCKED" || status === "PAID";

export function PayslipDialog({ item, user, onOpenChange }) {
  const published = isPublished(item?.period_status);
  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Phiếu lương điện tử</DialogTitle>
          <DialogDescription>Chi tiết thu nhập và khấu trừ</DialogDescription>
        </DialogHeader>
        {item && (
          <div className="grid gap-4">
            <PayslipHeader
              name={user?.full_name}
              code={user?.employee_code}
              department={user?.department}
              position={user?.position}
              monthYear={item.month_year}
              action={<PeriodStatusBadge status={item.period_status} />}
            />
            <PayslipBreakdown item={item} />
            {!published && (
              <p className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2.5 text-[12.5px] text-warning">
                <Info className="mt-px size-3.5 shrink-0" />
                Kỳ lương đang ở trạng thái nháp — số liệu có thể thay đổi cho tới khi phòng nhân sự chốt kỳ.
              </p>
            )}
            <DialogFooter className="no-print gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer /> In
              </Button>
              {published && (
                <Button asChild>
                  <a href={payslipDownloadUrl(item.period_id)} download>
                    <Download /> Tải phiếu lương
                  </a>
                </Button>
              )}
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
