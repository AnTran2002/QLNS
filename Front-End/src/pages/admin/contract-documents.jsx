import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, Eye, FileCheck2, FileClock, FileText, FileUp, FileX2, KeyRound, Loader2, ScanLine, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/animate-ui/components/radix/dialog";
import { DOCUMENT_STATUS, DOCX_ACCEPT, ExtractedData, FilePicker, SCAN_ACCEPT, StatusBadge, ValidationReport } from "@/components/app/contract";
import { EmptyState, ErrorState, FormError, LoadingState, PageHeader, SearchField, Segmented, StatTile } from "@/components/app/kit";
import { Reveal, RevealGroup } from "@/components/app/motion";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useMeta } from "@/hooks/use-meta";
import { api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const FILTERS = ["PENDING_REVIEW", "APPROVED", "REJECTED", "ALL"];

const issueCount = (v) => (v ? (v.errors?.length ?? 0) + (v.missing?.length ?? 0) : 0);

function useTemplateDownload() {
  return useMutation({ mutationFn: api.downloadContractTemplate, onError: (err) => toast.error(err.message) });
}

/* ------------------------------------------------------------------ */
/* Tải hợp đồng mới                                                     */
/* ------------------------------------------------------------------ */

function UploadDialog({ open, onOpenChange, onUploaded }) {
  const queryClient = useQueryClient();
  const { contractSchema } = useMeta();
  const [contract, setContract] = useState(null);
  const [scan, setScan] = useState(null);
  const [rejected, setRejected] = useState(null);

  const reset = () => {
    setContract(null);
    setScan(null);
    setRejected(null);
    upload.reset();
  };
  const upload = useMutation({
    mutationFn: () => api.uploadContractDocument({ contract, scan }),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ["contract-documents"] });
      toast.success(`Đã đọc hợp đồng của ${doc.full_name ?? "người lao động"} — kiểm tra rồi duyệt`);
      reset();
      onUploaded(doc.id);
    },
    onError: (err) => setRejected(err.details?.validation ? err.details : null),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tải lên hợp đồng lao động</DialogTitle>
          <DialogDescription>
            Hệ thống đọc file .docx (theo mẫu), lưu thông tin vào CSDL, cảnh báo ô thiếu và từ chối nội dung trái luật. Bản scan có chữ ký là bắt buộc trước khi
            duyệt tạo tài khoản.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <FilePicker label="Hợp đồng (.docx)" hint="Điền theo mẫu của hệ thống — tối đa 5MB" accept={DOCX_ACCEPT} file={contract} onChange={setContract} required />
          <FilePicker label="Bản scan có chữ ký" hint="PDF/JPG/PNG — có thể bổ sung sau" accept={SCAN_ACCEPT} file={scan} onChange={setScan} />
          <FormError message={upload.error?.message} />
          {rejected && (
            <>
              <ValidationReport validation={rejected.validation} />
              <details className="rounded-xl border border-border/70 p-3">
                <summary className="cursor-pointer text-[13px] font-medium">Thông tin đã đọc được</summary>
                <ExtractedData data={rejected.extracted} schema={contractSchema} className="mt-3" />
              </details>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button onClick={() => upload.mutate()} disabled={!contract || upload.isPending}>
            {upload.isPending ? <Loader2 className="animate-spin" /> : <Upload />} Đọc & kiểm tra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Chi tiết hồ sơ                                                       */
/* ------------------------------------------------------------------ */

function DocumentDialog({ id, onClose }) {
  const queryClient = useQueryClient();
  const { contractSchema } = useMeta();
  const [scan, setScan] = useState(null);
  const [note, setNote] = useState("");
  const [mode, setMode] = useState(null); // "approve" | "reject"
  const [account, setAccount] = useState(null);
  const { data: doc, isPending, error, refetch } = useQuery({
    queryKey: ["contract-document", id],
    queryFn: () => api.contractDocument(id),
    enabled: Boolean(id),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["contract-documents"] });
    queryClient.invalidateQueries({ queryKey: ["contract-document", id] });
  };
  const attach = useMutation({
    mutationFn: () => api.attachContractScan(id, scan),
    onSuccess: () => {
      setScan(null);
      refresh();
      toast.success("Đã cập nhật bản scan");
    },
  });
  const approve = useMutation({
    mutationFn: () => api.approveContractDocument(id, note.trim() || undefined),
    onSuccess: (res) => {
      refresh();
      ["employees", "contracts", "overview"].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      setAccount(res.account);
      setMode(null);
      toast.success(`Đã tạo tài khoản ${res.account.employee_code}`);
    },
    onError: () => refresh(),
  });
  const reject = useMutation({
    mutationFn: () => api.rejectContractDocument(id, note.trim()),
    onSuccess: () => {
      refresh();
      setMode(null);
      toast.success("Đã từ chối hồ sơ hợp đồng");
    },
  });
  const download = useMutation({ mutationFn: (kind) => api.downloadContractFile(id, kind), onError: (err) => toast.error(err.message) });

  const close = () => {
    setScan(null);
    setNote("");
    setMode(null);
    setAccount(null);
    approve.reset();
    reject.reset();
    onClose();
  };
  const pending = doc?.status === "PENDING_REVIEW";
  const actionError = (mode === "approve" ? approve.error : mode === "reject" ? reject.error : null)?.message;

  return (
    <Dialog open={Boolean(id)} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {doc ? (doc.full_name ?? "Hồ sơ hợp đồng") : "Hồ sơ hợp đồng"}
            {doc && <StatusBadge map={DOCUMENT_STATUS} status={doc.status} />}
          </DialogTitle>
          <DialogDescription>
            {doc
              ? `#${doc.id} · ${doc.contract_number ?? "chưa có số HĐ"} · tải lên bởi ${doc.uploader_name ?? "—"} · ${formatDate(doc.created_at)}`
              : "Đang tải…"}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : isPending ? (
          <LoadingState rows={2} />
        ) : (
          <div className="grid gap-5">
            {account && (
              <div className="rounded-xl border border-success/30 bg-success/8 p-4 text-[14px]">
                <p className="flex items-center gap-2 font-semibold text-success">
                  <KeyRound className="size-4" /> Đã tạo tài khoản nhân viên
                </p>
                <p className="mt-1 text-foreground/90">
                  Mã NV <strong className="font-mono">{account.employee_code}</strong> · {account.email} · mật khẩu mặc định{" "}
                  <strong className="font-mono">{account.default_password}</strong>. Nhân viên đổi mật khẩu sau lần đăng nhập đầu.
                </p>
              </div>
            )}

            {doc.review_note && !pending && (
              <p className="text-[13px] text-muted-foreground">
                {doc.status === "APPROVED" ? "Duyệt" : "Từ chối"} bởi {doc.reviewer_name ?? "nhân sự"} ({formatDate(doc.reviewed_at)}): {doc.review_note}
              </p>
            )}
            {doc.status === "APPROVED" && doc.hired_employee_code && !account && (
              <p className="text-[13px] text-success">Đã tạo tài khoản {doc.hired_employee_code}.</p>
            )}

            <section className="grid gap-2">
              <h3 className="text-[14px] font-semibold">File hợp đồng</h3>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => download.mutate("docx")} disabled={download.isPending}>
                  <FileText /> {doc.original_filename}
                </Button>
                {doc.has_scan ? (
                  <>
                    <Button size="sm" variant="outline" asChild>
                      <a href={api.contractFileUrl(doc.id, "scan")} target="_blank" rel="noreferrer">
                        <Eye /> Xem bản scan
                      </a>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => download.mutate("scan")} disabled={download.isPending}>
                      <Download /> Tải scan
                    </Button>
                  </>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-lg bg-warning/10 px-2.5 py-1.5 text-[12.5px] text-warning">
                    <ScanLine className="size-3.5" /> Chưa có bản scan — bắt buộc trước khi duyệt
                  </span>
                )}
              </div>
              {pending && (
                <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                  <FilePicker
                    label={doc.has_scan ? "Thay bản scan" : "Bổ sung bản scan có chữ ký"}
                    hint="Nhân sự đối chiếu bản giấy rồi tải lên — PDF/JPG/PNG"
                    accept={SCAN_ACCEPT}
                    file={scan}
                    onChange={setScan}
                  />
                  <Button size="sm" onClick={() => attach.mutate()} disabled={!scan || attach.isPending} className="sm:mb-1">
                    {attach.isPending ? <Loader2 className="animate-spin" /> : <Upload />} Lưu scan
                  </Button>
                </div>
              )}
              <FormError message={attach.error?.message} />
            </section>

            <section className="grid gap-2">
              <h3 className="text-[14px] font-semibold">Kiểm tra pháp lý & đầy đủ</h3>
              <ValidationReport validation={approve.error?.details?.validation ?? doc.validation} />
              {doc.validation?.checked_at && <p className="text-[12px] text-muted-foreground">Kiểm tra lúc {doc.validation.checked_at}</p>}
            </section>

            <section className="grid gap-2">
              <h3 className="text-[14px] font-semibold">Thông tin trích xuất từ hợp đồng</h3>
              <ExtractedData data={doc.extracted} schema={contractSchema} />
            </section>

            {pending && (
              <section className="grid gap-3 rounded-xl border border-border/70 p-4">
                <Label htmlFor="doc-note">{mode === "reject" ? "Lý do từ chối (bắt buộc)" : "Ghi chú duyệt"}</Label>
                <Textarea id="doc-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={mode === "reject" ? "VD: Bản scan không khớp file mềm" : "Không bắt buộc"} />
                <FormError message={actionError} />
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="destructive"
                    disabled={reject.isPending}
                    onClick={() => (mode === "reject" ? note.trim().length >= 3 && reject.mutate() : setMode("reject"))}
                  >
                    {reject.isPending ? <Loader2 className="animate-spin" /> : <X />} {mode === "reject" ? "Xác nhận từ chối" : "Từ chối"}
                  </Button>
                  <Button
                    disabled={approve.isPending || !doc.has_scan || !doc.validation?.complete}
                    onClick={() => {
                      setMode("approve");
                      approve.mutate();
                    }}
                    title={!doc.has_scan ? "Cần bản scan" : !doc.validation?.complete ? "Hợp đồng còn thiếu hoặc sai thông tin" : undefined}
                  >
                    {approve.isPending ? <Loader2 className="animate-spin" /> : <Check />} Duyệt & tạo tài khoản
                  </Button>
                </div>
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Trang                                                                */
/* ------------------------------------------------------------------ */

export default function ContractDocumentsPage() {
  const { data = [], isPending, error, refetch } = useQuery({ queryKey: ["contract-documents"], queryFn: () => api.contractDocuments() });
  const template = useTemplateDownload();
  const [filter, setFilter] = useState("PENDING_REVIEW");
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [openId, setOpenId] = useState(null);

  const count = (s) => (s === "ALL" ? data.length : data.filter((d) => d.status === s).length);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter(
      (d) =>
        (filter === "ALL" || d.status === filter) &&
        (!q || [d.full_name, d.email, d.contract_number, d.position, d.department, d.hired_employee_code].some((v) => String(v ?? "").toLowerCase().includes(q))),
    );
  }, [data, filter, query]);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Nhân sự"
        title="Hồ sơ hợp đồng"
        description="Mọi tài khoản nhân viên được tạo từ một hợp đồng hợp lệ: tải lên → hệ thống đọc & kiểm tra theo BLLĐ 2019 → đối chiếu bản scan → duyệt."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => template.mutate()} disabled={template.isPending}>
              {template.isPending ? <Loader2 className="animate-spin" /> : <Download />} Mẫu hợp đồng
            </Button>
            <Button onClick={() => setUploading(true)}>
              <FileUp /> Tải lên hợp đồng
            </Button>
          </div>
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
              <StatTile label="Chờ kiểm tra" value={count("PENDING_REVIEW")} icon={FileClock} hint="Cần đối chiếu & duyệt" />
              <StatTile
                label="Thiếu scan"
                value={data.filter((d) => d.status === "PENDING_REVIEW" && !d.has_scan).length}
                icon={ScanLine}
                hint="Chưa thể duyệt"
              />
              <StatTile label="Đã duyệt" value={count("APPROVED")} icon={FileCheck2} hint="Đã tạo tài khoản" />
              <StatTile label="Từ chối" value={count("REJECTED")} icon={FileX2} hint="Có ghi lý do" />
            </RevealGroup>
          </div>

          <Reveal delay={100}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <Segmented
                value={filter}
                onValueChange={setFilter}
                label="Lọc theo trạng thái"
                options={FILTERS.map((s) => ({ value: s, label: s === "ALL" ? "Tất cả" : DOCUMENT_STATUS[s].label, count: count(s) }))}
              />
              <SearchField value={query} onChange={setQuery} placeholder="Tên, email, số HĐ, mã NV" label="Tìm hồ sơ hợp đồng" className="md:w-80" />
            </div>
          </Reveal>

          {filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={data.length === 0 ? "Chưa có hồ sơ hợp đồng" : "Không có hồ sơ phù hợp"}
              description="Tải mẫu hợp đồng, điền thông tin người lao động rồi tải lên kèm bản scan có chữ ký."
              action={
                <Button onClick={() => setUploading(true)}>
                  <FileUp /> Tải lên hợp đồng
                </Button>
              }
            />
          ) : (
            <Reveal delay={160}>
              <div className="card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Người lao động</TableHead>
                      <TableHead className="hidden md:table-cell">Vị trí · Lương</TableHead>
                      <TableHead>Kiểm tra</TableHead>
                      <TableHead className="hidden lg:table-cell">Người tải lên</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((d) => {
                      const issues = issueCount(d.validation);
                      return (
                        <TableRow key={d.id} className="cursor-pointer" onClick={() => setOpenId(d.id)}>
                          <TableCell>
                            <button type="button" className="grid text-left" onClick={() => setOpenId(d.id)}>
                              <span className="text-[15px] font-medium">{d.full_name ?? "—"}</span>
                              <span className="text-[12.5px] text-muted-foreground">
                                <span className="font-mono">{d.contract_number ?? `#${d.id}`}</span> · {d.email ?? "chưa có email"}
                              </span>
                            </button>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="grid">
                              <span className="text-[14px]">
                                {d.position ?? "—"} · {d.department ?? "—"}
                              </span>
                              <span className="text-[12.5px] text-muted-foreground tabular-nums">{d.base_salary ? formatMoney(d.base_salary) : "—"}</span>
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="grid gap-0.5 text-[12.5px]">
                              <span className={cn(issues ? "text-warning" : "text-success")}>
                                {d.validation?.ok === false ? "Vi phạm" : issues ? `Thiếu ${issues} mục` : "Đủ thông tin"}
                              </span>
                              <span className={cn(d.has_scan ? "text-muted-foreground" : "text-warning")}>{d.has_scan ? "Có scan" : "Chưa có scan"}</span>
                            </span>
                          </TableCell>
                          <TableCell className="hidden text-[13px] text-muted-foreground lg:table-cell">
                            {d.uploader_name ?? "—"} · {formatDate(d.created_at)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge map={DOCUMENT_STATUS} status={d.status} />
                            {d.hired_employee_code && <span className="mt-1 block font-mono text-[11.5px] text-muted-foreground">{d.hired_employee_code}</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Reveal>
          )}
        </>
      )}

      <UploadDialog
        open={uploading}
        onOpenChange={setUploading}
        onUploaded={(docId) => {
          setUploading(false);
          setOpenId(docId);
        }}
      />
      <DocumentDialog id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
