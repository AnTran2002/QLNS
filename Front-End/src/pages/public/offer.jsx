import { useState } from "react";
import { useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Download, FileSignature, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { DOCX_ACCEPT, FilePicker, SCAN_ACCEPT, ValidationReport } from "@/components/app/contract";
import { ErrorState, FormError, LoadingState } from "@/components/app/kit";
import { Reveal } from "@/components/app/motion";
import { PublicShell } from "@/components/app/public-shell";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";

const STEPS = [
  ["Tải mẫu hợp đồng", "File .docx đã điền sẵn thông tin của bạn và thư mời."],
  ["Điền & kiểm tra", "Bổ sung các ô còn trống (người phụ thuộc, cam kết…). Không sửa tiêu đề các ô."],
  ["Ký & scan", "In, ký tên, scan hoặc chụp rõ nét (PDF/JPG/PNG)."],
  ["Nộp lại", "Tải lên cả file .docx và bản scan. Hệ thống tự đọc và kiểm tra theo luật lao động."],
];

export default function OfferPage() {
  const { token } = useParams();
  const queryClient = useQueryClient();
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["offer", token],
    queryFn: () => api.offer(token),
    retry: false,
  });
  const [contract, setContract] = useState(null);
  const [scan, setScan] = useState(null);
  const [result, setResult] = useState(null);

  const download = useMutation({
    mutationFn: () => api.downloadOfferTemplate(token),
    onError: (err) => toast.error(err.message),
  });
  const upload = useMutation({
    mutationFn: () => api.uploadOfferContract(token, contract, scan),
    onSuccess: (res) => {
      setResult({ validation: res.validation });
      toast.success("Đã nộp hợp đồng");
      queryClient.invalidateQueries({ queryKey: ["offer", token] });
    },
    onError: (err) => setResult(err.details?.validation ? { validation: err.details.validation, rejected: true } : null),
  });

  if (isPending) {
    return (
      <PublicShell>
        <LoadingState rows={3} label="Đang mở thư mời" />
      </PublicShell>
    );
  }
  if (error) {
    return (
      <PublicShell>
        <div className="mx-auto mt-10 max-w-lg">
          <ErrorState error={error} onRetry={error.status >= 500 || error.status === 0 ? refetch : undefined} />
        </div>
      </PublicShell>
    );
  }

  const { offer, branch, submitted, company } = data;
  const submittedOk = submitted && !result?.rejected;

  return (
    <PublicShell company={company}>
      <Reveal offset={10}>
        <div className="mt-6 mb-8 space-y-2">
          <p className="text-[13px] font-medium text-primary">Thư mời nhận việc · {company?.name}</p>
          <h1 className="page-title">Chúc mừng {data.full_name}!</h1>
          <p className="text-[15px] text-muted-foreground">
            Hồ sơ ứng tuyển vị trí <strong className="text-foreground">{data.position}</strong> — phòng {data.department}, {branch?.name} đã được duyệt.
            Link có hiệu lực đến {formatDate(data.token_expires_at)}.
          </p>
        </div>
      </Reveal>

      <div className="grid gap-5">
        <Reveal delay={60}>
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Điều kiện đề nghị</CardTitle>
              <CardDescription>Được ghi sẵn vào mẫu hợp đồng — hợp đồng nộp lại phải khớp mức lương này.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-[13.5px] sm:grid-cols-3">
                {[
                  ["Lương cơ bản", formatMoney(offer.base_salary)],
                  ["Phụ cấp", formatMoney(offer.allowance)],
                  ["Ngày bắt đầu", formatDate(offer.start_date)],
                  ["Loại hợp đồng", offer.contract_type_label ?? offer.contract_type],
                  ["Thử việc", offer.probation_days ? `${offer.probation_days} ngày (≥85% lương)` : "Không thử việc"],
                  ["Chi nhánh", `${branch?.name} (vùng ${branch?.region})`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-muted/50 px-3 py-2">
                    <dt className="text-[12px] text-muted-foreground">{k}</dt>
                    <dd className="font-medium tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
              {data.review_note && <p className="mt-3 text-[13px] text-muted-foreground">Ghi chú từ nhân sự: {data.review_note}</p>}
            </CardContent>
          </Card>
        </Reveal>

        {submittedOk ? (
          <Reveal delay={100}>
            <Card className="gap-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="size-5 text-warning" /> Đã nộp hợp đồng — chờ nhân sự đối chiếu
                </CardTitle>
                <CardDescription>
                  Nộp lúc {formatDate(submitted.created_at)}
                  {submitted.has_scan ? " · có bản scan" : " · chưa có bản scan (nhân sự sẽ liên hệ)"}. Khi được duyệt, bạn nhận tài khoản đăng nhập
                  qua email {data.email}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ValidationReport validation={result?.validation ?? submitted.validation} />
              </CardContent>
            </Card>
          </Reveal>
        ) : (
          <>
            <Reveal delay={100}>
              <Card className="gap-4">
                <CardHeader>
                  <CardTitle>Các bước hoàn tất hợp đồng</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="grid gap-3 sm:grid-cols-2">
                    {STEPS.map(([t, d], i) => (
                      <li key={t} className="flex gap-3 rounded-xl border border-border/70 p-3">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[13px] font-semibold text-primary tabular-nums">
                          {i + 1}
                        </span>
                        <span className="grid">
                          <span className="text-[14px] font-medium">{t}</span>
                          <span className="text-[12.5px] text-muted-foreground">{d}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" onClick={() => download.mutate()} disabled={download.isPending}>
                    {download.isPending ? <Loader2 className="animate-spin" /> : <Download />} Tải mẫu hợp đồng (.docx)
                  </Button>
                </CardFooter>
              </Card>
            </Reveal>

            <Reveal delay={140}>
              <Card className="gap-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSignature className="size-5" /> Nộp hợp đồng
                  </CardTitle>
                  <CardDescription>Hệ thống đọc file .docx, cảnh báo ô còn thiếu và từ chối nội dung trái Bộ luật Lao động 2019.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <FilePicker label="Hợp đồng đã điền (.docx)" hint="Tối đa 5MB — dùng đúng mẫu tải về ở trên" accept={DOCX_ACCEPT} file={contract} onChange={setContract} required />
                  <FilePicker label="Bản scan có chữ ký" hint="PDF, JPG hoặc PNG — tối đa 10MB" accept={SCAN_ACCEPT} file={scan} onChange={setScan} required />
                  <FormError message={upload.error?.message} />
                  {result?.validation && <ValidationReport validation={result.validation} />}
                </CardContent>
                <CardFooter className="justify-end">
                  <Button onClick={() => upload.mutate()} disabled={!contract || !scan || upload.isPending}>
                    {upload.isPending ? <Loader2 className="animate-spin" /> : <Upload />} Nộp hợp đồng
                  </Button>
                </CardFooter>
              </Card>
            </Reveal>
          </>
        )}

        {submittedOk && submitted.validation?.complete && (
          <p className="flex items-center justify-center gap-2 text-[13px] text-success">
            <CheckCircle2 className="size-4" /> Hợp đồng đủ thông tin — không cần thao tác thêm.
          </p>
        )}
      </div>
    </PublicShell>
  );
}
