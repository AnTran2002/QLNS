import { useState } from "react";
import { motion } from "motion/react";
import { Banknote, ChevronRight, FileText, Landmark, Receipt } from "lucide-react";
import { EmptyState, ErrorState, LoadingState, PageHeader, PeriodStatusBadge, StatTile } from "@/components/app/kit";
import { MoneyShort, Reveal, RevealGroup, SPRING } from "@/components/app/motion";
import { useEmployeeDashboard } from "@/hooks/use-employee-dashboard";
import { formatMoney, formatNumber, formatPeriod } from "@/lib/format";
import { PayslipDialog } from "./payslip-dialog";

export default function EmployeePayslips() {
  const { data, isPending, error, refetch } = useEmployeeDashboard();
  const [payslip, setPayslip] = useState(null);
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isPending) return <LoadingState rows={4} />;

  const history = data.payroll_history ?? [];
  const sum = (k) => history.reduce((s, i) => s + i[k], 0);
  const maxNet = Math.max(1, ...history.map((i) => i.net_salary));

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Thu nhập" title="Phiếu lương" description="Lịch sử các kỳ lương đã được tính. Chọn một kỳ để xem phiếu lương điện tử." />

      <div className="grid gap-3 sm:grid-cols-3 lg:gap-4">
        <RevealGroup step={70} itemClassName="h-full">
          <StatTile label="Tổng thực nhận" value={<MoneyShort value={sum("net_salary")} />} icon={Banknote} hint={`${history.length} kỳ lương`} />
          <StatTile label="Tổng BHXH đã đóng" value={<MoneyShort value={sum("social_insurance")} />} icon={Landmark} hint="10,5% lương đóng BHXH" />
          <StatTile label="Tổng thuế TNCN" value={<MoneyShort value={sum("personal_tax")} />} icon={Receipt} hint="Biểu thuế luỹ tiến 7 bậc" />
        </RevealGroup>
      </div>

      {history.length === 0 ? (
        <EmptyState icon={FileText} title="Chưa có phiếu lương" description="Phiếu lương sẽ xuất hiện khi phòng nhân sự tính lương kỳ đầu tiên." />
      ) : (
        <Reveal delay={120}>
          <ul className="card divide-y divide-border/70 overflow-hidden">
            {history.map((i, idx) => (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => setPayslip(i)}
                  className="group grid w-full grid-cols-[1fr_auto] items-center gap-x-6 gap-y-3 px-5 py-5 text-left transition-colors duration-200 hover:bg-muted/60 md:grid-cols-[180px_1fr_auto] md:px-7"
                  aria-label={`Xem phiếu lương ${formatPeriod(i.month_year)}`}
                >
                  <span className="flex flex-col gap-1.5">
                    <span className="text-[17px] font-semibold text-foreground">{formatPeriod(i.month_year)}</span>
                    <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
                      <PeriodStatusBadge status={i.period_status} />
                      <span className="tabular">{formatNumber(i.actual_days)}/{i.standard_days} công · {formatNumber(i.ot_hours)}h OT</span>
                    </span>
                  </span>
                  {/* Thanh so sánh thực nhận giữa các kỳ */}
                  <span className="col-span-2 row-start-2 h-1.5 overflow-hidden rounded-full bg-muted md:col-span-1 md:row-start-auto" aria-hidden="true">
                    <motion.span
                      className="block h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(i.net_salary / maxNet) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ ...SPRING, delay: 0.1 + idx * 0.06 }}
                    />
                  </span>
                  <span className="flex items-center gap-3 justify-self-end">
                    <span className="grid text-right">
                      <span className="tabular text-[17px] font-semibold text-foreground">{formatMoney(i.net_salary)}</span>
                      <span className="tabular text-[12px] text-muted-foreground">Gross {formatMoney(i.gross_salary)}</span>
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground/60 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Reveal>
      )}

      <PayslipDialog item={payslip} user={data.user_info} onOpenChange={(o) => !o && setPayslip(null)} />
    </div>
  );
}
