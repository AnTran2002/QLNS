import { useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingBlock, PageHeader, PeriodStatusBadge, StatCard } from "@/components/app/shared";
import { useEmployeeDashboard } from "@/hooks/use-employee-dashboard";
import { formatMoney, formatMoneyShort, formatNumber, formatPeriod } from "@/lib/format";
import { PayslipDialog } from "./payslip-dialog";
import { Banknote, Landmark, Receipt } from "lucide-react";

export default function EmployeePayslips() {
  const { data, isPending, error, refetch } = useEmployeeDashboard();
  const [payslip, setPayslip] = useState(null);
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isPending) return <LoadingBlock rows={4} />;

  const history = data.payroll_history ?? [];
  const sum = (k) => history.reduce((s, i) => s + i[k], 0);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Thu nhập" title="Phiếu lương" description="Lịch sử các kỳ lương đã được tính từ bảng payroll_items. Mở từng kỳ để xem phiếu lương điện tử." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Tổng thực nhận" value={formatMoneyShort(sum("net_salary"))} icon={Banknote} hint={`${history.length} kỳ lương`} />
        <StatCard label="Tổng BHXH đã đóng" value={formatMoneyShort(sum("social_insurance"))} icon={Landmark} hint="10,5% lương đóng BHXH" />
        <StatCard label="Tổng thuế TNCN" value={formatMoneyShort(sum("personal_tax"))} icon={Receipt} hint="Biểu thuế lũy tiến 7 bậc" />
      </div>

      {history.length === 0 ? (
        <EmptyState title="Chưa có phiếu lương" description="Phiếu lương sẽ xuất hiện khi phòng nhân sự tính lương kỳ đầu tiên." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-hairline">
          <Table>
            <TableHeader className="bg-surface-soft">
              <TableRow className="hover:bg-transparent">
                <TableHead>Kỳ lương</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Công / OT</TableHead>
                <TableHead className="hidden text-right md:table-cell">Gross</TableHead>
                <TableHead className="hidden text-right lg:table-cell">Khấu trừ</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="w-12"><span className="sr-only">Xem</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-ink">{formatPeriod(i.month_year)}</span>
                      <PeriodStatusBadge status={i.period_status} />
                    </div>
                  </TableCell>
                  <TableCell className="tabular hidden text-right sm:table-cell">{formatNumber(i.actual_days)}/{i.standard_days} · {formatNumber(i.ot_hours)}h</TableCell>
                  <TableCell className="tabular hidden text-right md:table-cell">{formatMoney(i.gross_salary)}</TableCell>
                  <TableCell className="tabular hidden text-right lg:table-cell">{formatMoney(i.social_insurance + i.personal_tax)}</TableCell>
                  <TableCell className="tabular text-right font-medium text-ink">{formatMoney(i.net_salary)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" onClick={() => setPayslip(i)} aria-label={`Xem phiếu lương ${formatPeriod(i.month_year)}`}>
                      <FileText />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PayslipDialog item={payslip} user={data.user_info} onOpenChange={(o) => !o && setPayslip(null)} />
    </div>
  );
}
