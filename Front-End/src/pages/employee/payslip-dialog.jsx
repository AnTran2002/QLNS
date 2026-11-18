import { Printer } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/animate-ui/components/radix/dialog";
import { PayslipBreakdown, PayslipHeader } from "@/components/app/payslip";
import { PeriodStatusBadge } from "@/components/app/kit";

export function PayslipDialog({ item, user, onOpenChange }) {
  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Phiếu lương điện tử</DialogTitle>
          <DialogDescription>Chi tiết thu nhập và khấu trừ</DialogDescription>
        </DialogHeader>
        {item && (
          <div className="grid gap-5">
            <PayslipHeader name={user?.full_name} code={user?.employee_code} department={user?.department} position={user?.position} monthYear={item.month_year} />
            <div className="flex items-center justify-between px-1 text-[13px] text-muted-foreground">
              <span>Trạng thái kỳ</span>
              <PeriodStatusBadge status={item.period_status} />
            </div>
            <PayslipBreakdown item={item} />
            <DialogFooter className="no-print">
              <Button variant="secondary" onClick={() => window.print()}><Printer /> In phiếu lương</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
