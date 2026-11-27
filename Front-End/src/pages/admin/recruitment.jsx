import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, Check, Copy, ExternalLink, Hourglass, Loader2, Mail, MailCheck, UserCheck, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/animate-ui/components/radix/dialog";
import { APPLICATION_STATUS, StatusBadge } from "@/components/app/contract";
import { EmptyState, ErrorState, FormError, InfoItem, LoadingState, PageHeader, PersonAvatar, SearchField, Segmented, StatTile } from "@/components/app/kit";
import { Reveal, RevealGroup } from "@/components/app/motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useMeta } from "@/hooks/use-meta";
import { api } from "@/lib/api";
import { contractLink, emailjsReady, sendEmail } from "@/lib/emailjs";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";

const FILTERS = ["PENDING", "APPROVED", "CONTRACT_SUBMITTED", "HIRED", "REJECTED", "ALL"];
const todayIso = () => new Date().toISOString().slice(0, 10);

/** Gửi email link hợp đồng qua EmailJS rồi ghi nhận ở Back-End. */
async function emailOffer(app, meta) {
  await sendEmail({
    to_email: app.email,
    to_name: app.full_name,
    position: app.position,
    department: app.department,
    branch: app.branch?.name,
    start_date: formatDate(app.offer?.start_date),
    base_salary: formatMoney(app.offer?.base_salary),
    contract_link: contractLink(app.contract_token),
    expires_at: formatDate(app.token_expires_at),
    company: meta.company?.name ?? meta.appName,
  });
  return api.markApplicationEmailed(app.id);
}

function ApproveForm({ app, contractTypes, maxProbation, onDone }) {
  const queryClient = useQueryClient();
  const meta = useMeta();
  const [offer, setOffer] = useState(() => ({
    base_salary: String(app.offer?.base_salary ?? app.expected_salary ?? ""),
    allowance: String(app.offer?.allowance ?? 0),
    start_date: app.offer?.start_date ?? (app.available_from >= todayIso() ? app.available_from : todayIso()),
    contract_type: app.offer?.contract_type ?? "FIXED_TERM",
    probation_days: String(app.offer?.probation_days ?? 60),
  }));
  const [note, setNote] = useState("");
  const [sendMail, setSendMail] = useState(emailjsReady());
  const set = (k) => (v) => setOffer((o) => ({ ...o, [k]: v }));
  const minimum = meta.payroll?.regional_minimum_wage?.[app.branch?.region];

  const approve = useMutation({
    mutationFn: async () => {
      const approved = await api.reviewApplication({
        id: app.id,
        decision: "APPROVE",
        note: note.trim() || undefined,
        offer: {
          base_salary: Number(offer.base_salary.replace(/\D/g, "")),
          allowance: Number(offer.allowance.replace(/\D/g, "")) || 0,
          start_date: offer.start_date,
          contract_type: offer.contract_type,
          probation_days: Number(offer.probation_days) || 0,
        },
      });
      if (!sendMail) return { approved, emailed: false };
      try {
        await emailOffer(approved, meta);
        return { approved, emailed: true };
      } catch (err) {
        return { approved, emailed: false, emailError: err.message };
      }
    },
    onSuccess: ({ approved, emailed, emailError }) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      if (emailed) toast.success(`Đã duyệt và gửi link hợp đồng tới ${approved.email}`);
      else if (emailError) toast.warning(`Đã duyệt nhưng gửi email thất bại: ${emailError}. Hãy sao chép link gửi thủ công.`);
      else toast.success("Đã duyệt — sao chép link hợp đồng để gửi cho ứng viên");
      onDone(approved);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        approve.mutate();
      }}
      noValidate
      className="grid gap-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="offer-base">Lương cơ bản đề nghị</Label>
          <Input id="offer-base" inputMode="numeric" value={offer.base_salary} onChange={(e) => set("base_salary")(e.target.value)} />
          <p className="text-[12px] text-muted-foreground">
            {formatMoney(offer.base_salary.replace(/\D/g, ""))}
            {minimum ? ` · tối thiểu vùng ${app.branch.region}: ${formatMoney(minimum)}` : ""}
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="offer-allowance">Phụ cấp</Label>
          <Input id="offer-allowance" inputMode="numeric" value={offer.allowance} onChange={(e) => set("allowance")(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="offer-start">Ngày bắt đầu</Label>
          <Input id="offer-start" type="date" min={todayIso()} value={offer.start_date} onChange={(e) => set("start_date")(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="offer-type">Loại hợp đồng</Label>
          <Select value={offer.contract_type} onValueChange={set("contract_type")}>
            <SelectTrigger id="offer-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(contractTypes).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="offer-probation">Thử việc (ngày)</Label>
          <Input
            id="offer-probation"
            type="number"
            min={0}
            max={maxProbation}
            value={offer.probation_days}
            onChange={(e) => set("probation_days")(e.target.value)}
          />
          <p className="text-[12px] text-muted-foreground">Tối đa {maxProbation} ngày (Điều 25 BLLĐ 2019)</p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="offer-note">Ghi chú cho ứng viên</Label>
          <Input id="offer-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Không bắt buộc" />
        </div>
      </div>
      <label className="flex items-start gap-2.5 text-[13.5px]">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-[var(--color-primary)]"
          checked={sendMail}
          disabled={!emailjsReady()}
          onChange={(e) => setSendMail(e.target.checked)}
        />
        <span>
          Gửi email link hợp đồng qua EmailJS tới <strong>{app.email}</strong>
          {!emailjsReady() && (
            <span className="block text-[12px] text-warning">Chưa cấu hình VITE_EMAILJS_* trong Front-End/.env — sẽ hiện link để gửi thủ công.</span>
          )}
        </span>
      </label>
      <FormError message={approve.error?.message} />
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={() => onDone(null)}>
          Huỷ
        </Button>
        <Button type="submit" disabled={approve.isPending}>
          {approve.isPending ? <Loader2 className="animate-spin" /> : <Check />} Duyệt hồ sơ
        </Button>
      </DialogFooter>
    </form>
  );
}

function RejectForm({ app, onDone }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const reject = useMutation({
    mutationFn: () => api.reviewApplication({ id: app.id, decision: "REJECT", note: note.trim() }),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success(`Đã từ chối hồ sơ của ${r.full_name}`);
      onDone(r);
    },
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (note.trim().length >= 3) reject.mutate();
      }}
      className="grid gap-3"
    >
      <Label htmlFor="reject-note">Lý do từ chối</Label>
      <Textarea id="reject-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Chưa phù hợp yêu cầu kinh nghiệm" />
      <FormError message={reject.error?.message} />
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={() => onDone(null)}>
          Huỷ
        </Button>
        <Button type="submit" variant="destructive" disabled={note.trim().length < 3 || reject.isPending}>
          {reject.isPending && <Loader2 className="animate-spin" />} Từ chối
        </Button>
      </DialogFooter>
    </form>
  );
}

function OfferLink({ app }) {
  const queryClient = useQueryClient();
  const meta = useMeta();
  const link = contractLink(app.contract_token);
  const resend = useMutation({
    mutationFn: () => emailOffer(app, meta),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success(`Đã gửi email tới ${app.email}`);
    },
    onError: (err) => toast.error(err.message),
  });
  const markSent = useMutation({
    mutationFn: () => api.markApplicationEmailed(app.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });
  return (
    <div className="grid gap-2 rounded-xl border border-border/70 p-3.5">
      <p className="text-[13px] font-medium">Link hợp đồng cho ứng viên</p>
      <div className="flex gap-2">
        <Input readOnly value={link} className="h-9 font-mono text-[12px]" onFocus={(e) => e.target.select()} />
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigator.clipboard?.writeText(link).then(() => toast.success("Đã sao chép link"))}
          aria-label="Sao chép link"
        >
          <Copy />
        </Button>
      </div>
      <p className="text-[12px] text-muted-foreground">
        Hết hạn {formatDate(app.token_expires_at)} ·{" "}
        {app.email_sent_at ? `đã gửi email ${formatDate(app.email_sent_at)}` : "chưa ghi nhận gửi email"}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => resend.mutate()} disabled={!emailjsReady() || resend.isPending}>
          {resend.isPending ? <Loader2 className="animate-spin" /> : <Mail />} {app.email_sent_at ? "Gửi lại email" : "Gửi email"}
        </Button>
        {!app.email_sent_at && (
          <Button size="sm" variant="ghost" onClick={() => markSent.mutate()} disabled={markSent.isPending}>
            <MailCheck /> Đánh dấu đã gửi thủ công
          </Button>
        )}
      </div>
    </div>
  );
}

function ApplicationDialog({ app, onClose }) {
  const meta = useMeta();
  const [mode, setMode] = useState(null);
  const maxProbation = Math.max(...Object.values(meta.payroll?.max_probation_days ?? { x: 60 }));
  const close = () => {
    setMode(null);
    onClose();
  };
  return (
    <Dialog open={Boolean(app)} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        {app && (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                {app.full_name} <StatusBadge map={APPLICATION_STATUS} status={app.status} />
              </DialogTitle>
              <DialogDescription>
                Hồ sơ #{app.id} · nộp {formatDate(app.created_at)} · đồng ý điều khoản {formatDate(app.agreed_terms_at)}
              </DialogDescription>
            </DialogHeader>

            {mode === "approve" ? (
              <ApproveForm app={app} contractTypes={meta.contractTypes} maxProbation={maxProbation} onDone={() => setMode(null)} />
            ) : mode === "reject" ? (
              <RejectForm app={app} onDone={(r) => (r ? close() : setMode(null))} />
            ) : (
              <div className="grid gap-4">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 [&_dd]:text-[14px]">
                  <InfoItem label="Email">{app.email}</InfoItem>
                  <InfoItem label="Điện thoại">{app.phone}</InfoItem>
                  <InfoItem label="Ngày sinh">{formatDate(app.date_of_birth)}</InfoItem>
                  <InfoItem label="Giới tính">{app.gender}</InfoItem>
                  <InfoItem label="CCCD" mono>
                    {app.national_id}
                  </InfoItem>
                  <InfoItem label="Trình độ">{app.education}</InfoItem>
                  <InfoItem label="Chi nhánh">
                    {app.branch?.name} (vùng {app.branch?.region})
                  </InfoItem>
                  <InfoItem label="Phòng ban · Vị trí">
                    {app.department} · {app.position}
                  </InfoItem>
                  <InfoItem label="Kinh nghiệm">{formatNumber(app.experience_years)} năm</InfoItem>
                  <InfoItem label="Lương mong muốn">{formatMoney(app.expected_salary)}</InfoItem>
                  <InfoItem label="Có thể đi làm">{formatDate(app.available_from)}</InfoItem>
                  <InfoItem label="Địa chỉ" className="col-span-2 sm:col-span-3">
                    {app.address}
                  </InfoItem>
                </dl>
                {app.introduction && <p className="rounded-xl bg-muted/50 p-3 text-[13.5px] whitespace-pre-line">{app.introduction}</p>}
                {app.offer && (
                  <p className="text-[13px] text-muted-foreground">
                    Đề nghị: {formatMoney(app.offer.base_salary)} + phụ cấp {formatMoney(app.offer.allowance)} · bắt đầu {formatDate(app.offer.start_date)} ·{" "}
                    {meta.contractTypes[app.offer.contract_type] ?? app.offer.contract_type} · thử việc {app.offer.probation_days} ngày
                  </p>
                )}
                {app.review_note && (
                  <p className="text-[13px] text-muted-foreground">
                    Ghi chú ({app.reviewer_name ?? "nhân sự"}, {formatDate(app.reviewed_at)}): {app.review_note}
                  </p>
                )}
                {app.contract_token && ["APPROVED", "CONTRACT_SUBMITTED"].includes(app.status) && <OfferLink app={app} />}
                <DialogFooter className="flex-wrap gap-2">
                  {app.status === "CONTRACT_SUBMITTED" && (
                    <Button variant="outline" asChild>
                      <Link to="/admin/ho-so-hop-dong">
                        <ExternalLink /> Kiểm tra hợp đồng đã nộp
                      </Link>
                    </Button>
                  )}
                  {["PENDING", "APPROVED", "CONTRACT_SUBMITTED"].includes(app.status) && (
                    <Button variant="destructive" onClick={() => setMode("reject")}>
                      <X /> Từ chối
                    </Button>
                  )}
                  {["PENDING", "APPROVED"].includes(app.status) && (
                    <Button onClick={() => setMode("approve")}>
                      <Check /> {app.status === "APPROVED" ? "Sửa đề nghị & cấp link mới" : "Duyệt & gửi link hợp đồng"}
                    </Button>
                  )}
                </DialogFooter>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function RecruitmentPage() {
  const { data = [], isPending, error, refetch } = useQuery({ queryKey: ["applications"], queryFn: () => api.applications() });
  const [filter, setFilter] = useState("PENDING");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);
  const open = data.find((a) => a.id === openId) ?? null;

  const count = (s) => (s === "ALL" ? data.length : data.filter((a) => a.status === s).length);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter(
      (a) =>
        (filter === "ALL" || a.status === filter) &&
        (!q || [a.full_name, a.email, a.phone, a.position, a.department, a.branch?.name].some((v) => String(v ?? "").toLowerCase().includes(q))),
    );
  }, [data, filter, query]);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Nhân sự"
        title="Tuyển dụng"
        description="Duyệt hồ sơ ứng tuyển, gửi link hợp đồng qua email. Tài khoản chỉ được tạo khi hợp đồng nộp lại được duyệt."
        actions={
          <Button variant="outline" asChild>
            <a href="/tuyen-dung" target="_blank" rel="noreferrer">
              <ExternalLink /> Trang ứng tuyển
            </a>
          </Button>
        }
      />

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isPending ? (
        <LoadingState rows={5} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <RevealGroup step={70} itemClassName="h-full">
              <StatTile label="Chờ duyệt" value={count("PENDING")} icon={Hourglass} hint="Hồ sơ mới" />
              <StatTile label="Chờ hợp đồng" value={count("APPROVED")} icon={Mail} hint="Đã gửi link" />
              <StatTile label="Đã nộp hợp đồng" value={count("CONTRACT_SUBMITTED")} icon={BriefcaseBusiness} hint="Cần đối chiếu scan" />
              <StatTile label="Đã tuyển" value={count("HIRED")} icon={UserCheck} hint="Có tài khoản" />
            </RevealGroup>
          </div>

          <Reveal delay={100}>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <Segmented
                value={filter}
                onValueChange={setFilter}
                label="Lọc theo trạng thái"
                options={FILTERS.map((s) => ({ value: s, label: s === "ALL" ? "Tất cả" : APPLICATION_STATUS[s].label.split(" · ")[0], count: count(s) }))}
              />
              <SearchField value={query} onChange={setQuery} placeholder="Tên, email, vị trí, chi nhánh" label="Tìm hồ sơ" className="xl:w-80" />
            </div>
          </Reveal>

          {filtered.length === 0 ? (
            <EmptyState icon={UserPlus} title={data.length === 0 ? "Chưa có hồ sơ ứng tuyển" : "Không có hồ sơ phù hợp"} description="Ứng viên nộp hồ sơ tại trang /tuyen-dung." />
          ) : (
            <Reveal delay={160}>
              <div className="card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Ứng viên</TableHead>
                      <TableHead>Vị trí</TableHead>
                      <TableHead className="hidden md:table-cell">Lương mong muốn</TableHead>
                      <TableHead className="hidden lg:table-cell">Ngày nộp</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((a) => (
                      <TableRow key={a.id} className="cursor-pointer" onClick={() => setOpenId(a.id)}>
                        <TableCell>
                          <button type="button" className="flex items-center gap-3 text-left" onClick={() => setOpenId(a.id)}>
                            <PersonAvatar name={a.full_name} seed={a.email} size="sm" />
                            <span className="grid min-w-0">
                              <span className="text-[15px] font-medium">{a.full_name}</span>
                              <span className="text-[13px] text-muted-foreground">{a.email}</span>
                            </span>
                          </button>
                        </TableCell>
                        <TableCell>
                          <span className="grid">
                            <span className="text-[14px]">{a.position}</span>
                            <span className="text-[12.5px] text-muted-foreground">
                              {a.department} · {a.branch?.code}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="hidden tabular-nums md:table-cell">{formatMoney(a.expected_salary)}</TableCell>
                        <TableCell className="hidden tabular-nums lg:table-cell">{formatDate(a.created_at)}</TableCell>
                        <TableCell>
                          <StatusBadge map={APPLICATION_STATUS} status={a.status} />
                          {a.status === "APPROVED" && !a.email_sent_at && <span className="mt-1 block text-[11.5px] text-warning">Chưa gửi email</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Reveal>
          )}
        </>
      )}

      <ApplicationDialog app={open} onClose={() => setOpenId(null)} />
    </div>
  );
}
