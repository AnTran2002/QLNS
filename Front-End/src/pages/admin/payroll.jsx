import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, Download, FileText, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingBlock, PageHeader, PeriodStatusBadge, PersonAvatar } from "@/components/app/shared";
import { PayslipBreakdown, PayslipHeader } from "@/components/app/payslip";
import { api } from "@/lib/api";
import { formatMoney, formatMoneyShort, formatNumber, formatPeriod } from "@/lib/format";

function CalculateForm({ employee, period, item, onClose }) {
  const queryClient = useQueryClient();
  const [actualDays, setActualDays] = useState(item?.actual_days ?? period.standard_days);
  const [otHours, setOtHours] = useState(item?.ot_hours ?? 0);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const mutation = useMutation({
    mutationFn: () => api.calculatePayroll({ user_id: employee.id, period_id: period.id, actual_days: actualDays, ot_hours: otHours }),
    onSuccess: (data) => {
      setResult(data.calculation);
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
      toast.success(`Đã tính và lưu lương cho ${employee.full_name}`);
    },
    onError: (err) => setError(err.message),
  });

  const submit = (e) => {
    e.preventDefault();
    const d = Number(actualDays);
    const ot = Number(otHours);
    if (!Number.isFinite(d) || d < 0) return setError("Ngày công phải là số không âm");
    if (!Number.isFinite(ot) || ot < 0) return setError("Giờ OT phải là số không âm");
    setError("");
    mutation.mutate();
  };

  if (result) {
    return (
      <div className="grid gap-5">
        <PayslipHeader name={employee.full_name} code={employee.employee_code} department={employee.department} position={employee.position} monthYear={period.month_year} />
        <PayslipBreakdown item={{ ...result, standard_days: period.standard_days }} detail={result} />
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setResult(null)}>Tính lại</Button>
          <Button onClick={onClose}>Xong</Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="actual_days" className="mb-2 text-[13px] text-ink">Ngày công thực tế</Label>
          <Input id="actual_days" type="number" min="0" step="0.5" value={actualDays} onChange={(e) => setActualDays(e.target.value)} className="tabular" />
          <p className="mt-1.5 text-[12px] text-muted-foreground">Công chuẩn kỳ này: {period.standard_days} ngày</p>
        </div>
        <div>
          <Label htmlFor="ot_hours" className="mb-2 text-[13px] text-ink">Giờ làm thêm (OT)</Label>
          <Input id="ot_hours" type="number" min="0" step="0.5" value={otHours} onChange={(e) => setOtHours(e.target.value)} className="tabular" />
          <p className="mt-1.5 text-[12px] text-muted-foreground">Hệ số OT 1,5</p>
        </div>
      </div>
      <div className="grid gap-1 rounded-lg bg-surface-card p-4 text-[13px] text-body">
        <p>Lương cơ bản <span className="tabular font-medium text-ink">{formatMoney(employee.base_salary)}</span> · Phụ cấp <span className="tabular font-medium text-ink">{formatMoney(employee.allowance)}</span></p>
        <p>Lương đóng BHXH <span className="tabular font-medium text-ink">{formatMoney(employee.insurance_salary)}</span> · Người phụ thuộc <span className="font-medium text-ink">{employee.dependents_count}</span></p>
      </div>
      {error && <p role="alert" className="rounded-md bg-destructive/8 px-3.5 py-2.5 text-[14px] text-destructive">{error}</p>}
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Huỷ</Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="animate-spin" /> : <Calculator />} Tính & lưu
        </Button>
      </DialogFooter>
    </form>
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
  const [viewing, setViewing] = useState(null); // item

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
  const editable = period?.status === "DRAFT";
  const error = periodsQuery.error || employeesQuery.error || itemsQuery.error;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Bảng lương"
        title="Kỳ lương & tính lương"
        description="Nhập ngày công và giờ OT, engine PayrollEngine tính Gross → Net theo biểu thuế 7 bậc và lưu vào payroll_items."
        actions={
          <>
            {periods.length > 0 && (
              <Select value={String(period?.id ?? "")} onValueChange={setSelectedId}>
                <SelectTrigger className="w-48" aria-label="Chọn kỳ lương"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {periods.map((p) => <SelectItem key={p.id} value={String(p.id)}>{formatPeriod(p.month_year)}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" disabled={!items.length} onClick={() => exportCsv(period, items)}>
              <Download /> Xuất CSV
            </Button>
          </>
        }
      />

      {error ? (
        <ErrorState error={error} onRetry={() => { periodsQuery.refetch(); employeesQuery.refetch(); itemsQuery.refetch(); }} />
      ) : periodsQuery.isPending || employeesQuery.isPending ? (
        <LoadingBlock rows={4} />
      ) : !period ? (
        <EmptyState title="Chưa có kỳ lương" description="Thêm một dòng vào bảng payroll_periods (VD: 2026-12, DRAFT) để bắt đầu." />
      ) : (
        <>
          {/* Dải tóm tắt kỳ lương — dark surface */}
          <section className="grid gap-6 rounded-xl bg-surface-dark p-6 text-on-dark md:grid-cols-[1.2fr_2fr] md:p-8">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <p className="caption-upper text-primary">Kỳ lương</p>
                <PeriodStatusBadge status={period.status} />
              </div>
              <p className="font-serif text-[40px] leading-none tracking-[-1px]">{formatPeriod(period.month_year)}</p>
              <p className="text-[14px] text-on-dark-soft">
                {period.standard_days} ngày công chuẩn · đã tính {items.length}/{employeesQuery.data?.length ?? 0} nhân viên
              </p>
              {!editable && (
                <p className="flex items-center gap-2 text-[13px] text-on-dark-soft">
                  <Lock className="size-3.5" /> Kỳ đã khoá — Back-End chỉ cho tính lương kỳ ở trạng thái DRAFT.
                </p>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ["Tổng Gross", totals.gross],
                ["BHXH trích", totals.insurance],
                ["Thuế TNCN", totals.tax],
                ["Tổng Net", totals.net],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-surface-dark-elevated p-4">
                  <dt className="text-[12px] text-on-dark-soft">{label}</dt>
                  <dd className="tabular mt-2 font-serif text-[22px] leading-none tracking-[-0.3px]">{formatMoneyShort(value)}</dd>
                </div>
              ))}
            </dl>
          </section>

          {itemsQuery.isPending ? (
            <LoadingBlock rows={5} />
          ) : (
            <div className="overflow-hidden rounded-lg border border-hairline">
              <Table>
                <TableHeader className="bg-surface-soft">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Nhân viên</TableHead>
                    <TableHead className="text-right">Công / OT</TableHead>
                    <TableHead className="hidden text-right md:table-cell">Gross</TableHead>
                    <TableHead className="hidden text-right lg:table-cell">BHXH</TableHead>
                    <TableHead className="hidden text-right lg:table-cell">Thuế TNCN</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="w-28 text-right"><span className="sr-only">Thao tác</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ employee, item }) => {
                    const name = employee?.full_name ?? item?.full_name;
                    const code = employee?.employee_code ?? item?.employee_code;
                    return (
                      <TableRow key={employee?.id ?? `item-${item.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <PersonAvatar name={name} seed={code} size="sm" />
                            <span className="grid">
                              <span className="font-medium text-ink">{name}</span>
                              <span className="text-[13px] text-muted-foreground">
                                <span className="font-mono text-[12px]">{code}</span> · {employee?.department ?? item?.department}
                              </span>
                            </span>
                          </div>
                        </TableCell>
                        {item ? (
                          <>
                            <TableCell className="tabular text-right">{formatNumber(item.actual_days)} · {formatNumber(item.ot_hours)}h</TableCell>
                            <TableCell className="tabular hidden text-right md:table-cell">{formatMoney(item.gross_salary)}</TableCell>
                            <TableCell className="tabular hidden text-right lg:table-cell">{formatMoney(item.social_insurance)}</TableCell>
                            <TableCell className="tabular hidden text-right lg:table-cell">{formatMoney(item.personal_tax)}</TableCell>
                            <TableCell className="tabular text-right font-medium text-ink">{formatMoney(item.net_salary)}</TableCell>
                          </>
                        ) : (
                          <TableCell colSpan={5} className="text-right text-[13px] text-muted-foreground">Chưa tính lương kỳ này</TableCell>
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
                                <Calculator /> {item ? "Tính lại" : "Tính"}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
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
