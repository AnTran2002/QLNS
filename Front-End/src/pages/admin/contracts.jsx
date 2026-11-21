import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { FileSignature, FileText, Lock, ShieldCheck, Users, Wallet } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/animate-ui/components/radix/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState, PageHeader, PersonAvatar, SearchField, StatTile } from "@/components/app/kit";
import { Count, MoneyShort, Reveal, RevealGroup, SPRING } from "@/components/app/motion";
import { api } from "@/lib/api";
import { PAYROLL_RULES } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";

const TERMS = [
  ["base_salary", "Lương cơ bản", "money"],
  ["insurance_salary", "Lương đóng BHXH", "money"],
  ["allowance", "Phụ cấp cố định", "money"],
  ["dependents_count", "Người phụ thuộc", "count"],
];
const termValue = (c, key, kind) => (kind === "money" ? formatMoney(c[key]) : `${c[key]} người`);

/** Văn bản hợp đồng — chỉ xem. Điều chỉnh lương = phụ lục mới (tạo từ hồ sơ nhân viên, bắt buộc lý do). */
function ContractDocument({ contract }) {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["contracts", contract.id],
    queryFn: () => api.contract(contract.id),
  });
  const history = data?.history ?? [];
  const insurance = contract.insurance_salary * PAYROLL_RULES.insuranceRate;
  const deduction = PAYROLL_RULES.personalDeduction + contract.dependents_count * PAYROLL_RULES.dependentDeduction;

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-xl border border-border/80">
        <p className="flex items-center justify-between gap-3 border-b border-border/70 bg-muted/50 px-4 py-2 text-[12px] font-medium text-muted-foreground">
          <span>Điều khoản lương đang hiệu lực</span>
          <span className="inline-flex items-center gap-1"><Lock className="size-3" /> Cố định</span>
        </p>
        <dl className="grid divide-y divide-border/60 sm:grid-cols-2 sm:divide-y-0">
          {TERMS.map(([key, label, kind]) => (
            <div key={key} className="px-4 py-3 sm:border-b sm:border-border/60 sm:odd:border-r">
              <dt className="text-[12px] text-muted-foreground">{label}</dt>
              <dd className="tabular mt-0.5 text-[15px] font-medium text-foreground">{termValue(contract, key, kind)}</dd>
            </div>
          ))}
        </dl>
        <div className="grid gap-1 px-4 py-3 text-[12.5px] text-muted-foreground sm:grid-cols-2">
          <p>BH người lao động (10,5%): <b className="tabular font-medium text-foreground">{formatMoney(insurance)}</b></p>
          <p>Giảm trừ gia cảnh / tháng: <b className="tabular font-medium text-foreground">{formatMoney(deduction)}</b></p>
        </div>
      </section>

      <section className="grid gap-2">
        <p className="text-[13px] font-medium">Lịch sử ký kết & phụ lục</p>
        {error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : isPending ? (
          <LoadingState rows={2} />
        ) : (
          <ol className="grid gap-2">
            {history.map((v, i) => (
              <li key={v.id} className="rounded-xl border border-border/70 px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[13.5px] font-medium">
                    {i === history.length - 1 ? "Hợp đồng gốc" : `Phụ lục ${history.length - 1 - i}`}
                    {i === 0 && <span className="ml-2 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">Đang hiệu lực</span>}
                  </p>
                  <span className="text-[12px] text-muted-foreground">{formatDate(v.created_at)}</span>
                </div>
                <p className="mt-1 text-[13px] text-foreground/85">{v.change_reason || "—"}</p>
                <p className="tabular mt-1 text-[12px] text-muted-foreground">
                  Lương cơ bản {formatMoney(v.base_salary)} · BHXH {formatMoney(v.insurance_salary)} · Phụ cấp {formatMoney(v.allowance)} · NPT {v.dependents_count}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <p className="rounded-xl bg-muted/60 px-4 py-3 text-[12.5px] text-muted-foreground">
        Hợp đồng là văn bản cố định, không sửa trực tiếp. Khi thay đổi lương, vào <b className="font-medium text-foreground">Nhân viên → Sửa → Điều chỉnh lương</b> và ghi lý do —
        hệ thống lưu thành phụ lục mới, các bản trước được giữ nguyên.
      </p>
    </div>
  );
}

export default function ContractsPage() {
  const { data: contracts = [], isPending, error, refetch } = useQuery({ queryKey: ["contracts"], queryFn: api.contracts });
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState(null);

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
        description="Văn bản cố định, chỉ xem — mỗi lần điều chỉnh lương là một phụ lục kèm lý do, bản cũ được lưu lại."
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
                  <TableHead className="hidden lg:table-cell">Hiệu lực từ</TableHead>
                  <TableHead className="w-14"><span className="sr-only">Xem</span></TableHead>
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
                      <TableCell className="tabular hidden text-foreground/85 lg:table-cell">
                        {formatDate(c.created_at)}
                        {c.version_count > 1 && <span className="block text-[12px] text-muted-foreground">{c.version_count - 1} phụ lục</span>}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon-sm" onClick={() => setViewing(c)} aria-label={`Xem hợp đồng của ${c.full_name}`}>
                          <FileText />
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

      <Dialog open={Boolean(viewing)} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Hợp đồng lao động HĐ-{String(viewing?.id ?? "").padStart(3, "0")}</DialogTitle>
            <DialogDescription>
              {viewing?.full_name} · <span className="font-mono">{viewing?.employee_code}</span>
              {viewing?.joined_at ? ` · vào làm ${formatDate(viewing.joined_at)}` : ""}
            </DialogDescription>
          </DialogHeader>
          {viewing && <ContractDocument contract={viewing} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
