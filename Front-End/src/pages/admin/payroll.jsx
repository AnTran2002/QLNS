import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Calculator, Download, FileText, Loader2, Lock, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/animate-ui/components/radix/dialog";
import { Progress } from "@/components/animate-ui/components/radix/progress";
import { AutoHeight } from "@/components/animate-ui/primitives/effects/auto-height";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, FormError, LoadingState, PageHeader, PeriodStatusBadge, PersonAvatar } from "@/components/app/kit";
import { MoneyShort, Reveal, SPRING } from "@/components/app/motion";
import { PayslipBreakdown, PayslipHeader } from "@/components/app/payslip";
import { api } from "@/lib/api";
import { formatMoney, formatNumber, formatPeriod } from "@/lib/format";

function CalculateForm({ employee, period, item, onClose }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const attendanceQuery = useQuery({
    queryKey: ["payroll", "attendance", period.id],
    queryFn: () => api.payrollAttendance(period.id),
  });
  const actualDays = attendanceQuery.data?.items?.find((row) => row.user_id === employee.id)?.actual_days ?? item?.actual_days ?? 0;
  const otHours = attendanceQuery.data?.items?.find((row) => row.user_id === employee.id)?.ot_hours ?? 0;

  const mutation = useMutation({
    mutationFn: () => api.calculatePayroll({ user_id: employee.id, period_id: period.id, ot_hours: otHours, reason: reason.trim() }),
    onSuccess: (data) => {
      setResult(data.calculation);
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
      toast.success(`Đã tính và lưu lương cho ${employee.full_name}`);
    },
    onError: (err) => setError(err.message),
  });

  const submit = (e) => {
    e.preventDefault();
    const ot = Number(otHours);
    if (!Number.isFinite(ot) || ot < 0) return setError("Giờ OT phải là số không âm");
    if (reason.trim().length < 10 || reason.trim().length > 500) return setError("Lý do cần cụ thể, từ 10 đến 500 ký tự");
    setError("");
    mutation.mutate();
  };

  return (
    <AutoHeight deps={[result, error]} transition={{ type: "spring", stiffness: 260, damping: 30 }}>
      <AnimatePresence mode="wait" initial={false}>
        {result ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.98, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.98, filter: "blur(6px)" }}
            transition={SPRING}
            className="grid gap-5"
          >
            <PayslipHeader name={employee.full_name} code={employee.employee_code} department={employee.department} position={employee.position} monthYear={period.month_year} />
            <PayslipBreakdown item={{ ...result, standard_days: period.standard_days }} detail={result} />
            <DialogFooter>
              <Button variant="secondary" onClick={() => setResult(null)}>Tính lại</Button>
              <Button onClick={onClose}>Xong</Button>
            </DialogFooter>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={submit}
            noValidate
            initial={{ opacity: 0, scale: 0.98, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.98, filter: "blur(6px)" }}
            transition={SPRING}
            className="grid gap-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="actual_days">Ngày công thực tế</Label>
                <p id="actual_days" className="rounded-lg border border-input bg-muted/50 px-3 py-2 text-right tabular-nums">{formatNumber(actualDays)} ngày</p>
                <p className="text-[12px] text-muted-foreground">Tự tính từ chấm công từng ngày · Công chuẩn: {period.standard_days} ngày</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ot_hours">Giờ làm thêm (OT)</Label>
                <p id="ot_hours" className="rounded-lg border border-input bg-muted/50 px-3 py-2 text-right tabular-nums">{formatNumber(otHours)} giờ</p>
                <p className="text-[12px] text-muted-foreground">Tự tính từ chấm công · hệ số OT 1,5</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 rounded-2xl bg-muted p-4 text-[14px]">
              {[
                ["Lương cơ bản", formatMoney(employee.base_salary)],
                ["Phụ cấp", formatMoney(employee.allowance)],
                ["Lương đóng BHXH", formatMoney(employee.insurance_salary)],
                ["Người phụ thuộc", employee.dependents_count],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[12px] text-muted-foreground">{k}</dt>
                  <dd className="tabular mt-0.5 font-medium text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="space-y-2">
              <Label htmlFor="payroll-change-reason">Lý do tính/cập nhật lương</Label>
              <Textarea
                id="payroll-change-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Ghi rõ căn cứ điều chỉnh hoặc tính lương (10–500 ký tự)"
                aria-invalid={Boolean(error) || undefined}
              />
            </div>
            <FormError message={error || attendanceQuery.error?.message} />
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onClose}>Huỷ</Button>
              <Button type="submit" disabled={mutation.isPending || attendanceQuery.isPending || Boolean(attendanceQuery.error)}>
                {mutation.isPending ? <Loader2 className="animate-spin" /> : <Calculator />} Tính & lưu
              </Button>
            </DialogFooter>
          </motion.form>
        )}
      </AnimatePresence>
    </AutoHeight>
  );
}

function exportCsv(period, rows) {
  const header = ["Mã NV", "Họ tên", "Phòng ban", "Ngày công", "Giờ OT", "Gross", "BHXH", "Giảm trừ gia cảnh", "Thuế TNCN", "Net"];
  const lines = rows.map((r) => [
    r.employee_code, r.full_name, r.department, r.actual_days, r.ot_hours,
    Math.round(r.gross_salary), Math.round(r.social_insurance), Math.round(r.tax_deduction), Math.round(r.personal_tax), Math.round(r.net_salary),
  ]);
  const csv = [header, ...lines].map((l) => l.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `bang-luong-${period.month_year}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

export default function PayrollPage() {
  const periodsQuery = useQuery({ queryKey: ["payroll", "periods"], queryFn: api.payrollPeriods });
  const employeesQuery = useQuery({ queryKey: ["employees"], queryFn: api.employees });
  const periods = periodsQuery.data ?? [];
  const [selectedId, setSelectedId] = useState(null);
  const period = periods.find((p) => String(p.id) === String(selectedId)) ?? periods[0];

  const itemsQuery = useQuery({
    queryKey: ["payroll", "items", period?.id],
    queryFn: () => api.payrollItems(period.id),
    enabled: Boolean(period),
  });

  const [target, setTarget] = useState(null); // { employee, item }
  const [viewing, setViewing] = useState(null); // { item, employee }

  const rows = useMemo(() => {
    const items = itemsQuery.data ?? [];
    const byUser = new Map(items.map((i) => [i.user_id, i]));
    const employees = employeesQuery.data ?? [];
    const merged = employees.map((e) => ({ employee: e, item: byUser.get(e.id) ?? null }));
    // Dòng lương của người không còn trong danh sách nhân viên (hiếm) vẫn hiển thị
    for (const i of items) if (!employees.some((e) => e.id === i.user_id)) merged.push({ employee: null, item: i });
    return merged;
  }, [itemsQuery.data, employeesQuery.data]);

  const items = itemsQuery.data ?? [];
  const totals = {
    gross: items.reduce((s, i) => s + i.gross_salary, 0),
    net: items.reduce((s, i) => s + i.net_salary, 0),
    insurance: items.reduce((s, i) => s + i.social_insurance, 0),
    tax: items.reduce((s, i) => s + i.personal_tax, 0),
  };
  const headcount = employeesQuery.data?.length ?? 0;
  const editable = period?.status === "DRAFT";
  const error = periodsQuery.error || employeesQuery.error || itemsQuery.error;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Tiền lương"
        title="Bảng lương"
        description="Ngày công lấy từ chấm công từng ngày; nhập giờ OT để hệ thống tính Gross → Net theo quy định thuế của năm tính lương."
        actions={
          <>
            {periods.length > 0 && (
              <Select value={String(period?.id ?? "")} onValueChange={setSelectedId}>
                <SelectTrigger size="sm" className="w-44" aria-label="Chọn kỳ lương"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {periods.map((p) => <SelectItem key={p.id} value={String(p.id)}>{formatPeriod(p.month_year)}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" disabled={!items.length} onClick={() => exportCsv(period, items)}>
              <Download /> Xuất CSV
            </Button>
          </>
        }
      />

      {error ? (
        <ErrorState error={error} onRetry={() => { periodsQuery.refetch(); employeesQuery.refetch(); itemsQuery.refetch(); }} />
      ) : periodsQuery.isPending || employeesQuery.isPending ? (
        <LoadingState rows={4} />
      ) : !period ? (
        <EmptyState icon={Wallet} title="Chưa có kỳ lương" description="Vào mục Chấm công & OT để tạo kỳ lương mới (Tháng/Năm) và nhập OT." />
      ) : (
        <>
          <Reveal delay={80}>
            <section className="tile grid gap-8 p-7 md:grid-cols-[1fr_1.6fr] md:p-10">
              <div className="flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <p className="text-[14px] font-semibold text-tile-muted">Kỳ lương</p>
                    <PeriodStatusBadge status={period.status} onTile />
                  </div>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.p
                      key={period.id}
                      initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -12, filter: "blur(8px)" }}
                      transition={SPRING}
                      className="font-display text-[40px] leading-none font-semibold tracking-[-0.035em] md:text-[48px]"
                    >
                      {formatPeriod(period.month_year)}
                    </motion.p>
                  </AnimatePresence>
                  <p className="text-[15px] text-tile-muted">
                    {period.standard_days} ngày công chuẩn · đã tính {items.length}/{headcount} nhân viên
                  </p>
                </div>
                <div className="space-y-3">
                  <Progress value={headcount ? Math.min(100, (items.length / headcount) * 100) : 0} className="h-1.5 bg-white/12" aria-label="Tiến độ tính lương" />
                  {!editable && (
                    <p className="flex items-center gap-2 text-[13px] text-tile-muted">
                      <Lock className="size-3.5" /> Kỳ đã khoá — chỉ tính lương được ở kỳ Nháp.
                    </p>
                  )}
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3">
                {[
                  ["Tổng Gross", totals.gross],
                  ["BHXH trích", totals.insurance],
                  ["Thuế TNCN", totals.tax],
                  ["Tổng Net", totals.net],
                ].map(([label, value], i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...SPRING, delay: 0.15 + i * 0.06 }}
                    className={i === 3 ? "rounded-2xl bg-primary p-5 text-white" : "rounded-2xl bg-tile-elevated p-5"}
                  >
                    <dt className={i === 3 ? "text-[13px] text-white/80" : "text-[13px] text-tile-muted"}>{label}</dt>
                    <dd className="mt-3 font-display text-[26px] leading-none font-semibold tracking-[-0.03em] md:text-[30px]">
                      <MoneyShort key={`${period.id}-${label}`} value={value} />
                    </dd>
                  </motion.div>
                ))}
              </dl>
            </section>
          </Reveal>

          {itemsQuery.isPending ? (
            <LoadingState rows={5} />
          ) : (
            <Reveal delay={160}>
              <div className="card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Nhân viên</TableHead>
                      <TableHead className="hidden text-right sm:table-cell md:hidden lg:table-cell">Công / OT</TableHead>
                      <TableHead className="hidden text-right md:table-cell">Gross</TableHead>
                      <TableHead className="hidden text-right lg:table-cell">BHXH</TableHead>
                      <TableHead className="hidden text-right lg:table-cell">Thuế TNCN</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead className="w-12 text-right sm:w-32"><span className="sr-only">Thao tác</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(({ employee, item }, i) => {
                      const name = employee?.full_name ?? item?.full_name;
                      const code = employee?.employee_code ?? item?.employee_code;
                      return (
                        <motion.tr
                          key={`${period.id}-${employee?.id ?? `item-${item.id}`}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ ...SPRING, delay: Math.min(i, 12) * 0.03 }}
                          className="border-b border-border/60 transition-colors duration-200 hover:bg-muted/60"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <PersonAvatar name={name} seed={code} size="sm" />
                              <span className="grid min-w-0">
                                <span className="text-[15px] font-medium text-foreground max-sm:whitespace-normal">{name}</span>
                                <span className="text-[13px] text-muted-foreground max-sm:whitespace-normal">
                                  <span className="font-mono text-[12px]">{code}</span> · {employee?.department ?? item?.department}
                                </span>
                              </span>
                            </div>
                          </TableCell>
                          {item ? (
                            <>
                              <TableCell className="tabular hidden text-right text-foreground/85 sm:table-cell md:hidden lg:table-cell">{formatNumber(item.actual_days)} · {formatNumber(item.ot_hours)}h</TableCell>
                              <TableCell className="tabular hidden text-right text-foreground/85 md:table-cell">{formatMoney(item.gross_salary)}</TableCell>
                              <TableCell className="tabular hidden text-right text-foreground/85 lg:table-cell">{formatMoney(item.social_insurance)}</TableCell>
                              <TableCell className="tabular hidden text-right text-foreground/85 lg:table-cell">{formatMoney(item.personal_tax)}</TableCell>
                              <TableCell className="tabular text-right font-semibold text-foreground">{formatMoney(item.net_salary)}</TableCell>
                            </>
                          ) : (
                            <TableCell colSpan={5} className="text-right whitespace-normal text-[13px] text-muted-foreground">Chưa tính lương kỳ này</TableCell>
                          )}
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {item && (
                                <Button variant="ghost" size="icon-sm" aria-label={`Xem phiếu lương của ${name}`} onClick={() => setViewing({ item, employee })}>
                                  <FileText />
                                </Button>
                              )}
                              {editable && employee && (
                                <Button
                                  variant={item ? "ghost" : "secondary"}
                                  size="sm"
                                  disabled={!employee.contract_id}
                                  title={employee.contract_id ? undefined : "Nhân viên chưa có hợp đồng"}
                                  onClick={() => setTarget({ employee, item })}
                                >
                                  <Calculator /> <span className="max-sm:sr-only">{item ? "Tính lại" : "Tính"}</span>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Reveal>
          )}
        </>
      )}

      <Dialog open={Boolean(target)} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tính lương</DialogTitle>
            <DialogDescription>{target?.employee.full_name} · {formatPeriod(period?.month_year)}</DialogDescription>
          </DialogHeader>
          {target && <CalculateForm employee={target.employee} item={target.item} period={period} onClose={() => setTarget(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewing)} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader className="sr-only">
            <DialogTitle>Phiếu lương</DialogTitle>
            <DialogDescription>Chi tiết phiếu lương</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="grid gap-5">
              <PayslipHeader
                name={viewing.item.full_name}
                code={viewing.item.employee_code}
                department={viewing.item.department}
                position={viewing.item.position}
                monthYear={period?.month_year}
              />
              <PayslipBreakdown item={viewing.item} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
