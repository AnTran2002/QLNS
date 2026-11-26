import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { FileSignature, Loader2, ShieldCheck, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/animate-ui/components/radix/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, FormError, LoadingState, PageHeader, PersonAvatar, SearchField, StatTile } from "@/components/app/kit";
import { Count, Money, MoneyShort, Reveal, RevealGroup, SPRING } from "@/components/app/motion";
import { api } from "@/lib/api";
import { PAYROLL_RULES } from "@/lib/constants";
import { formatDate, formatMoney, formatPeriod } from "@/lib/format";

const FIELDS = [
  ["base_salary", "Lương cơ bản (₫)", "100000"],
  ["insurance_salary", "Lương đóng BHXH (₫)", "100000"],
  ["allowance", "Phụ cấp cố định (₫)", "100000"],
  ["dependents_count", "Số người phụ thuộc", "1"],
];

function SalaryAdjustmentForm({ contract, onOpenChange }) {
  const queryClient = useQueryClient();
  const { data: history = [], isPending: historyPending, error: historyError } = useQuery({
    queryKey: ["salary-adjustments", contract.id],
    queryFn: () => api.salaryAdjustments(contract.id),
  });
  const [form, setForm] = useState(() => ({
    base_salary: contract.base_salary,
    insurance_salary: contract.insurance_salary,
    allowance: contract.allowance,
    dependents_count: contract.dependents_count,
  }));
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const effectiveMonthDate = new Date();
  effectiveMonthDate.setDate(1);
  effectiveMonthDate.setMonth(effectiveMonthDate.getMonth() + 1);
  const effectiveMonth = `${effectiveMonthDate.getFullYear()}-${String(effectiveMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const alreadyScheduled = history.some((adjustment) => adjustment.effective_month === effectiveMonth);

  const mutation = useMutation({
    mutationFn: () => api.createSalaryAdjustment(contract.id, { ...form, reason }),
    onSuccess: (adjustment) => {
      queryClient.setQueryData(["salary-adjustments", contract.id], (previous = []) => [adjustment, ...previous]);
      toast.success(`Đã ghi nhận điều chỉnh có hiệu lực từ ${formatPeriod(adjustment.effective_month)}`);
      onOpenChange(false);
    },
    onError: (err) => setError(err.message),
  });

  const submit = (e) => {
    e.preventDefault();
    if (historyPending || historyError) return setError("Không thể tải lịch sử điều chỉnh; hãy thử lại trước khi ghi nhận.");
    if (alreadyScheduled) return setError("Hợp đồng đã có điều chỉnh cho tháng kế tiếp.");
    for (const [key, label] of FIELDS) {
      const n = Number(form[key]);
      if (!Number.isFinite(n) || n < 0) return setError(`${label} phải là số không âm`);
    }
    if (!Number.isInteger(Number(form.dependents_count))) return setError("Số người phụ thuộc phải là số nguyên");
    if (reason.trim().length < 10 || reason.trim().length > 500) return setError("Lý do cần cụ thể, từ 10 đến 500 ký tự");
    if (!FIELDS.some(([key]) => Number(form[key]) !== Number(contract[key]))) {
      return setError("Cần thay đổi ít nhất một thông số lương");
    }
    setError("");
    mutation.mutate();
  };

  const insurance = Number(form.insurance_salary || 0) * PAYROLL_RULES.insuranceRate;
  const deduction = PAYROLL_RULES.personalDeduction + Number(form.dependents_count || 0) * PAYROLL_RULES.dependentDeduction;

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <p className="rounded-xl border border-border/70 bg-muted/50 px-4 py-3 text-[13px] text-muted-foreground">
        Mức lương mới có hiệu lực từ tháng kế tiếp: <b className="font-medium text-foreground">{formatPeriod(effectiveMonth)}</b>.
        Mỗi hợp đồng chỉ tạo một điều chỉnh cho tháng hiệu lực này.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map(([key, label, step]) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{label}</Label>
            <Input
              id={key}
              type="number"
              min="0"
              step={step}
              value={form[key]}
              onChange={(e) => {
                setError("");
                setForm((f) => ({ ...f, [key]: e.target.value }));
              }}
              className="tabular"
              disabled={alreadyScheduled}
            />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor="salary-adjustment-reason">Lý do điều chỉnh</Label>
        <Textarea
          id="salary-adjustment-reason"
          value={reason}
          onChange={(e) => {
            setError("");
            setReason(e.target.value);
          }}
          maxLength={500}
          placeholder="Mô tả căn cứ thay đổi cụ thể (10–500 ký tự)"
          disabled={alreadyScheduled}
        />
      </div>
      {/* Xem trước — số lăn theo từng lần gõ */}
      <div className="tile grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <p className="text-[13px] text-tile-muted">Trích BHXH người lao động (10,5%)</p>
          <Money value={insurance} className="mt-1 text-[20px] font-semibold" />
        </div>
        <div>
          <p className="text-[13px] text-tile-muted">Giảm trừ gia cảnh / tháng</p>
          <Money value={deduction} className="mt-1 text-[20px] font-semibold" />
        </div>
      </div>
      {alreadyScheduled && (
        <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-[13px] text-warning">
          Hợp đồng đã có điều chỉnh lương hiệu lực từ tháng kế tiếp.
        </p>
      )}
      {historyError && <FormError message={historyError.message} />}
      {historyPending ? (
        <p className="text-[13px] text-muted-foreground">Đang tải lịch sử điều chỉnh…</p>
      ) : history.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-[13px] font-semibold">Lịch sử điều chỉnh</h3>
          <div className="max-h-48 space-y-3 overflow-y-auto rounded-xl border border-border/70 p-3">
            {history.map((adjustment) => (
              <article key={adjustment.id} className="border-b border-border/60 pb-3 last:border-0 last:pb-0">
                <p className="text-[12px] font-medium">
                  Hiệu lực {formatPeriod(adjustment.effective_month)} · {adjustment.changed_by_name || "Quản trị viên"} · {formatDate(adjustment.created_at)}
                </p>
                <div className="mt-1 grid gap-x-4 text-[12px] text-muted-foreground sm:grid-cols-2">
                  <p>Lương cơ bản: {formatMoney(adjustment.previous_base_salary)} → {formatMoney(adjustment.base_salary)}</p>
                  <p>Lương BHXH: {formatMoney(adjustment.previous_insurance_salary)} → {formatMoney(adjustment.insurance_salary)}</p>
                  <p>Phụ cấp: {formatMoney(adjustment.previous_allowance)} → {formatMoney(adjustment.allowance)}</p>
                  <p>Người phụ thuộc: {adjustment.previous_dependents_count} → {adjustment.dependents_count}</p>
                </div>
                <p className="text-[12px] text-muted-foreground">Lý do: {adjustment.reason}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      <FormError message={error} />
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Huỷ</Button>
        <Button type="submit" disabled={mutation.isPending || historyPending || historyError || alreadyScheduled}>
          {mutation.isPending && <Loader2 className="animate-spin" />} Ghi nhận điều chỉnh
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function ContractsPage() {
  const { data: contracts = [], isPending, error, refetch } = useQuery({ queryKey: ["contracts"], queryFn: api.contracts });
  const [query, setQuery] = useState("");
  const [adjusting, setAdjusting] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contracts;
    return contracts.filter((c) => [c.full_name, c.employee_code, c.department].some((v) => String(v).toLowerCase().includes(q)));
  }, [contracts, query]);

  const totals = useMemo(() => ({
    base: contracts.reduce((s, c) => s + c.base_salary, 0),
    allowance: contracts.reduce((s, c) => s + c.allowance, 0),
    insurance: contracts.reduce((s, c) => s + c.insurance_salary * PAYROLL_RULES.insuranceRate, 0),
  }), [contracts]);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Tiền lương"
        title="Hợp đồng lao động"
        description="Thông số lương hiện hành chỉ xem; điều chỉnh lương phải có lý do và có hiệu lực từ tháng kế tiếp."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <RevealGroup step={70} itemClassName="h-full">
          <StatTile label="Số hợp đồng" value={<Count value={contracts.length} />} icon={FileSignature} hint="Đang hiệu lực" />
          <StatTile label="Tổng lương cơ bản" value={<MoneyShort value={totals.base} />} icon={Wallet} hint="Mỗi tháng" />
          <StatTile label="Tổng phụ cấp" value={<MoneyShort value={totals.allowance} />} icon={Users} hint="Mỗi tháng" />
          <StatTile label="BHXH người lao động" value={<MoneyShort value={totals.insurance} />} icon={ShieldCheck} hint="10,5% lương đóng BHXH" />
        </RevealGroup>
      </div>

      <Reveal delay={100}>
        <SearchField value={query} onChange={setQuery} placeholder="Tìm theo tên, mã nhân viên, phòng ban" label="Tìm hợp đồng" />
      </Reveal>

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isPending ? (
        <LoadingState rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileSignature} title="Không có hợp đồng phù hợp" />
      ) : (
        <Reveal delay={160}>
          <div className="card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nhân viên</TableHead>
                  <TableHead className="text-right">Lương cơ bản</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Lương BHXH</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Phụ cấp</TableHead>
                  <TableHead className="hidden text-center lg:table-cell">NPT</TableHead>
                  <TableHead className="hidden lg:table-cell">Ngày tạo</TableHead>
                  <TableHead className="w-14"><span className="sr-only">Điều chỉnh lương</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence initial={false} mode="popLayout">
                  {filtered.map((c, i) => (
                    <motion.tr
                      key={c.id}
                      layout="position"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0, transition: { ...SPRING, delay: Math.min(i, 12) * 0.025 } }}
                      exit={{ opacity: 0, transition: { duration: 0.15 } }}
                      transition={SPRING}
                      className="border-b border-border/60 transition-colors duration-200 hover:bg-muted/60"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <PersonAvatar name={c.full_name} seed={c.employee_code} src={c.avatar} size="sm" />
                          <span className="grid min-w-0">
                            <span className="text-[15px] font-medium text-foreground max-sm:whitespace-normal">{c.full_name}</span>
                            <span className="text-[13px] text-muted-foreground max-sm:whitespace-normal">
                              <span className="font-mono text-[12px]">HĐ-{String(c.id).padStart(3, "0")}</span> · {c.department}
                            </span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular text-right text-foreground">{formatMoney(c.base_salary)}</TableCell>
                      <TableCell className="tabular hidden text-right text-foreground/85 md:table-cell">{formatMoney(c.insurance_salary)}</TableCell>
                      <TableCell className="tabular hidden text-right text-foreground/85 md:table-cell">{formatMoney(c.allowance)}</TableCell>
                      <TableCell className="tabular hidden text-center text-foreground/85 lg:table-cell">{c.dependents_count}</TableCell>
                      <TableCell className="tabular hidden text-foreground/85 lg:table-cell">{formatDate(c.created_at)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon-sm" onClick={() => setAdjusting(c)} aria-label={`Điều chỉnh lương của ${c.full_name}`}>
                          <Wallet />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </Reveal>
      )}

      <Dialog open={Boolean(adjusting)} onOpenChange={(o) => !o && setAdjusting(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Điều chỉnh lương</DialogTitle>
            <DialogDescription>
              {adjusting?.full_name} · <span className="font-mono">{adjusting?.employee_code}</span>
            </DialogDescription>
          </DialogHeader>
          {adjusting && <SalaryAdjustmentForm contract={adjusting} onOpenChange={(o) => !o && setAdjusting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
