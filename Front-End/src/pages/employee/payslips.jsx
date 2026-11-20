import { useMemo, useState } from "react";
import { Banknote, Download, Eye, FileText, Landmark, Receipt, TrendingUp } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/animate-ui/components/radix/tooltip";
import { KpiCard } from "@/components/admin/kpi-card";
import { EarningsChart } from "@/components/employee/earnings-chart";
import { EmptyState, ErrorState, LoadingState, PeriodStatusBadge, Segmented } from "@/components/app/kit";
import { Reveal } from "@/components/app/motion";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmployeeDashboard } from "@/hooks/use-employee-dashboard";
import { payslipDownloadUrl } from "@/lib/api";
import { formatMoney, formatMoneyShort, formatNumber, formatPeriod } from "@/lib/format";
import { isPublished, PayslipDialog } from "./payslip-dialog";

const sum = (rows, k) => rows.reduce((s, i) => s + (Number(i[k]) || 0), 0);

export default function EmployeePayslips() {
  const { data, isPending, error, refetch } = useEmployeeDashboard();
  const [payslip, setPayslip] = useState(null);
  const [filter, setFilter] = useState("all");
  const history = useMemo(() => data?.payroll_history ?? [], [data]);
  const rows = useMemo(
    () => history.filter((i) => filter === "all" || (filter === "published" ? isPublished(i.period_status) : !isPublished(i.period_status))),
    [history, filter],
  );

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isPending) return <LoadingState rows={4} />;

  const published = history.filter((i) => isPublished(i.period_status));
  const totalNet = sum(history, "net_salary");
  const best = history.reduce((m, i) => (!m || i.net_salary > m.net_salary ? i : m), null);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Reveal offset={8}>
          <h1 className="page-title">Phiếu lương</h1>
          <p className="text-[14px] text-muted-foreground">
            Lịch sử các kỳ lương đã tính. Phiếu lương được phát hành và tải về được khi kỳ đã chốt.
          </p>
        </Reveal>
      </header>

      <section aria-label="Tổng hợp thu nhập" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Tổng thực nhận", icon: Banknote, value: formatMoneyShort(totalNet), hint: `${history.length} kỳ · ${published.length} đã phát hành` },
          {
            label: "Thực nhận trung bình",
            icon: TrendingUp,
            value: formatMoneyShort(history.length ? totalNet / history.length : 0),
            hint: best ? `Cao nhất ${formatPeriod(best.month_year).toLowerCase()}` : "Chưa có dữ liệu",
          },
          { label: "BHXH đã đóng", icon: Landmark, value: formatMoneyShort(sum(history, "social_insurance")), hint: "10,5% lương đóng bảo hiểm" },
          { label: "Thuế TNCN đã nộp", icon: Receipt, value: formatMoneyShort(sum(history, "personal_tax")), hint: "Biểu thuế luỹ tiến từng phần" },
        ].map((k, i) => (
          <Reveal key={k.label} delay={60 + i * 50} offset={10} className="h-full">
            <KpiCard {...k} />
          </Reveal>
        ))}
      </section>

      {history.length === 0 ? (
        <EmptyState icon={FileText} title="Chưa có phiếu lương" description="Phiếu lương sẽ xuất hiện khi phòng nhân sự tính lương kỳ đầu tiên." />
      ) : (
        <>
          <Reveal delay={120} offset={14}>
            <EarningsChart history={history} className="gap-4" />
          </Reveal>

          <Reveal delay={160} offset={14}>
            <Card className="gap-0 py-0">
              <CardHeader className="border-b border-border/70 px-4 py-4 sm:px-5 [.border-b]:pb-4">
                <CardTitle>Các kỳ lương</CardTitle>
                <CardDescription>Chọn một dòng để xem chi tiết phiếu lương</CardDescription>
                <CardAction className="max-md:col-span-2 max-md:col-start-1 max-md:row-start-3 max-md:mt-3 max-md:justify-self-stretch">
                  <Segmented
                    value={filter}
                    onValueChange={setFilter}
                    label="Lọc theo trạng thái phát hành"
                    options={[
                      { value: "all", label: "Tất cả", count: history.length },
                      { value: "published", label: "Đã phát hành", count: published.length },
                      { value: "draft", label: "Nháp", count: history.length - published.length },
                    ]}
                  />
                </CardAction>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4 sm:pl-5">Kỳ lương</TableHead>
                    <TableHead className="text-right max-md:hidden">Công · OT</TableHead>
                    <TableHead className="text-right max-lg:hidden">Gross</TableHead>
                    <TableHead className="text-right max-lg:hidden">Khấu trừ</TableHead>
                    <TableHead className="text-right">Thực nhận</TableHead>
                    <TableHead className="w-12 pr-3 text-right sm:w-24 sm:pr-5">
                      <span className="sr-only">Thao tác</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={6} className="py-10 text-center text-[13px] text-muted-foreground">
                        Không có kỳ lương phù hợp.
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map((i) => {
                    const pub = isPublished(i.period_status);
                    return (
                      <TableRow key={i.id} className="cursor-pointer" onClick={() => setPayslip(i)}>
                        <TableCell className="pl-4 sm:pl-5">
                          <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2.5">
                            <span className="font-medium whitespace-nowrap">{formatPeriod(i.month_year)}</span>
                            <PeriodStatusBadge status={i.period_status} />
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums max-md:hidden">
                          {formatNumber(i.actual_days)}/{i.standard_days} · {formatNumber(i.ot_hours)}h
                        </TableCell>
                        <TableCell className="text-right tabular-nums max-lg:hidden">{formatMoney(i.gross_salary)}</TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums max-lg:hidden">
                          − {formatMoney(i.social_insurance + i.personal_tax)}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{formatMoney(i.net_salary)}</TableCell>
                        <TableCell className="pr-3 sm:pr-5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" className="max-sm:hidden" onClick={() => setPayslip(i)} aria-label={`Xem phiếu lương ${formatPeriod(i.month_year)}`}>
                              <Eye />
                            </Button>
                            {pub ? (
                              <Button variant="ghost" size="icon-sm" asChild>
                                <a href={payslipDownloadUrl(i.period_id)} download aria-label={`Tải phiếu lương ${formatPeriod(i.month_year)}`}>
                                  <Download />
                                </a>
                              </Button>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span tabIndex={0} className="inline-flex size-8 cursor-not-allowed items-center justify-center rounded-lg text-muted-foreground/50">
                                    <Download className="size-4" aria-hidden="true" />
                                    <span className="sr-only">Chưa phát hành</span>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>Tải được khi kỳ lương đã chốt</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </Reveal>
        </>
      )}

      <PayslipDialog item={payslip} user={data.user_info} onOpenChange={(o) => !o && setPayslip(null)} />
    </div>
  );
}
