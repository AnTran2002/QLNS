import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingBlock, PageHeader, PersonAvatar, StatCard } from "@/components/app/shared";
import { api } from "@/lib/api";
import { PAYROLL_RULES } from "@/lib/constants";
import { formatDate, formatMoney, formatMoneyShort } from "@/lib/format";
import { FileSignature, Users, Wallet, ShieldCheck } from "lucide-react";

const FIELDS = [
  ["base_salary", "Lương cơ bản (₫)", "100000"],
  ["insurance_salary", "Lương đóng BHXH (₫)", "100000"],
  ["allowance", "Phụ cấp cố định (₫)", "100000"],
  ["dependents_count", "Số người phụ thuộc", "1"],
];

function ContractDialog({ contract, onOpenChange }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => ({
    base_salary: contract.base_salary,
    insurance_salary: contract.insurance_salary,
    allowance: contract.allowance,
    dependents_count: contract.dependents_count,
  }));
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.updateContract(contract.id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success(`Đã cập nhật hợp đồng của ${contract.full_name}`);
      onOpenChange(false);
    },
    onError: (err) => setError(err.message),
  });

  const submit = (e) => {
    e.preventDefault();
    for (const [key, label] of FIELDS) {
      const n = Number(form[key]);
      if (!Number.isFinite(n) || n < 0) return setError(`${label} phải là số không âm`);
    }
    if (!Number.isInteger(Number(form.dependents_count))) return setError("Số người phụ thuộc phải là số nguyên");
    setError("");
    mutation.mutate();
  };

  const insurance = Number(form.insurance_salary || 0) * PAYROLL_RULES.insuranceRate;
  const deduction = PAYROLL_RULES.personalDeduction + Number(form.dependents_count || 0) * PAYROLL_RULES.dependentDeduction;

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map(([key, label, step]) => (
          <div key={key}>
            <Label htmlFor={key} className="mb-2 text-[13px] text-ink">{label}</Label>
            <Input
              id={key}
              type="number"
              min="0"
              step={step}
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              className="tabular"
            />
          </div>
        ))}
      </div>
      <div className="grid gap-3 rounded-lg bg-surface-card p-4 text-[14px] sm:grid-cols-2">
        <div>
          <p className="text-[13px] text-muted-foreground">Trích BHXH người lao động (10,5%)</p>
          <p className="tabular mt-1 font-medium text-ink">{formatMoney(insurance)}</p>
        </div>
        <div>
          <p className="text-[13px] text-muted-foreground">Giảm trừ gia cảnh / tháng</p>
          <p className="tabular mt-1 font-medium text-ink">{formatMoney(deduction)}</p>
        </div>
      </div>
      {error && <p role="alert" className="rounded-md bg-destructive/8 px-3.5 py-2.5 text-[14px] text-destructive">{error}</p>}
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="animate-spin" />} Lưu hợp đồng
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function ContractsPage() {
  const { data: contracts = [], isPending, error, refetch } = useQuery({ queryKey: ["contracts"], queryFn: api.contracts });
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);

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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Hợp đồng"
        title="Hợp đồng lao động"
        description="Thông số lương làm căn cứ cho engine tính lương: lương cơ bản, lương đóng BHXH, phụ cấp và người phụ thuộc."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Số hợp đồng" value={contracts.length} icon={FileSignature} hint="Bảng contracts" />
        <StatCard label="Tổng lương cơ bản" value={formatMoneyShort(totals.base)} icon={Wallet} hint="Mỗi tháng" />
        <StatCard label="Tổng phụ cấp" value={formatMoneyShort(totals.allowance)} icon={Users} hint="Mỗi tháng" />
        <StatCard label="BHXH người lao động" value={formatMoneyShort(totals.insurance)} icon={ShieldCheck} hint="10,5% lương đóng BHXH" />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-soft" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên, mã nhân viên, phòng ban…" className="pl-10" aria-label="Tìm hợp đồng" />
      </div>

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isPending ? (
        <LoadingBlock rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Không có hợp đồng phù hợp" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-hairline">
          <Table>
            <TableHeader className="bg-surface-soft">
              <TableRow className="hover:bg-transparent">
                <TableHead>Nhân viên</TableHead>
                <TableHead className="text-right">Lương cơ bản</TableHead>
                <TableHead className="hidden text-right md:table-cell">Lương BHXH</TableHead>
                <TableHead className="hidden text-right md:table-cell">Phụ cấp</TableHead>
                <TableHead className="hidden text-center lg:table-cell">NPT</TableHead>
                <TableHead className="hidden lg:table-cell">Ngày tạo</TableHead>
                <TableHead className="w-12"><span className="sr-only">Sửa</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <PersonAvatar name={c.full_name} seed={c.employee_code} size="sm" />
                      <span className="grid">
                        <span className="font-medium text-ink">{c.full_name}</span>
                        <span className="text-[13px] text-muted-foreground">
                          <span className="font-mono text-[12px]">HĐ-{String(c.id).padStart(3, "0")}</span> · {c.department}
                        </span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="tabular text-right text-ink">{formatMoney(c.base_salary)}</TableCell>
                  <TableCell className="tabular hidden text-right md:table-cell">{formatMoney(c.insurance_salary)}</TableCell>
                  <TableCell className="tabular hidden text-right md:table-cell">{formatMoney(c.allowance)}</TableCell>
                  <TableCell className="tabular hidden text-center lg:table-cell">{c.dependents_count}</TableCell>
                  <TableCell className="tabular hidden lg:table-cell">{formatDate(c.created_at)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(c)} aria-label={`Sửa hợp đồng của ${c.full_name}`}>
                      <Pencil />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Sửa hợp đồng</DialogTitle>
            <DialogDescription>
              {editing?.full_name} · <span className="font-mono">{editing?.employee_code}</span>
            </DialogDescription>
          </DialogHeader>
          {editing && <ContractDialog contract={editing} onOpenChange={(o) => !o && setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
