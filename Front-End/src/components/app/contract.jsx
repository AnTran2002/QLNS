import { useId, useRef } from "react";
import { AlertTriangle, CheckCircle2, CircleDashed, FileUp, Scale, X, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Trạng thái hồ sơ hợp đồng (ENUM contract_documents.status). */
export const DOCUMENT_STATUS = {
  PENDING_REVIEW: { label: "Chờ kiểm tra", variant: "warning" },
  APPROVED: { label: "Đã duyệt", variant: "success" },
  REJECTED: { label: "Từ chối", variant: "destructive" },
};

export function StatusBadge({ map, status }) {
  const s = map[status];
  return <Badge variant={s?.variant ?? "outline"}>{s?.label ?? status}</Badge>;
}

/* ------------------------------------------------------------------ */
/* Kết quả kiểm tra hợp đồng                                           */
/* ------------------------------------------------------------------ */

function IssueList({ title, items, tone, icon: Icon }) {
  if (!items?.length) return null;
  const tones = {
    error: "border-destructive/25 bg-destructive/6 text-destructive",
    missing: "border-warning/30 bg-warning/8 text-warning",
    warning: "border-border bg-muted/50 text-foreground",
  };
  return (
    <section className={cn("rounded-xl border p-3.5", tones[tone])}>
      <h4 className="mb-2 flex items-center gap-2 text-[13.5px] font-semibold">
        <Icon className="size-4" aria-hidden="true" /> {title} <span className="tabular-nums opacity-70">({items.length})</span>
      </h4>
      <ul className="grid gap-1.5">
        {items.map((it, i) => (
          <li key={`${it.field}-${i}`} className="text-[13px] leading-snug text-foreground/90">
            <span className="font-medium text-foreground">{it.label}:</span> {it.message}
            {it.law && (
              <span className="mt-0.5 flex items-start gap-1 text-[12px] text-muted-foreground">
                <Scale className="mt-px size-3 shrink-0" aria-hidden="true" /> {it.law}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Hiển thị `validation` { missing, errors, warnings, ok, complete } từ ContractValidator. */
export function ValidationReport({ validation, className }) {
  if (!validation) return null;
  const { missing = [], errors = [], warnings = [], ok, complete } = validation;
  return (
    <div className={cn("grid gap-3", className)}>
      <p
        className={cn(
          "flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium",
          !ok ? "bg-destructive/10 text-destructive" : complete ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
        )}
      >
        {!ok ? <XCircle className="size-4" /> : complete ? <CheckCircle2 className="size-4" /> : <CircleDashed className="size-4" />}
        {!ok
          ? "Hợp đồng vi phạm quy định — không thể chấp nhận"
          : complete
            ? "Hợp đồng hợp lệ và đủ thông tin bắt buộc"
            : "Hợp đồng hợp lệ nhưng còn thiếu thông tin bắt buộc"}
      </p>
      <IssueList title="Vi phạm / sai thông tin" items={errors} tone="error" icon={XCircle} />
      <IssueList title="Thiếu thông tin bắt buộc" items={missing} tone="missing" icon={CircleDashed} />
      <IssueList title="Lưu ý" items={warnings} tone="warning" icon={AlertTriangle} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dữ liệu đọc được từ hợp đồng                                         */
/* ------------------------------------------------------------------ */

function displayValue(field, value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "Có" : "Không";
  switch (field.type) {
    case "date":
      return formatDate(value);
    case "money":
      return formatMoney(value);
    case "rate":
      return `${Math.round(Number(value) * 1000) / 10}%`;
    default:
      return String(value);
  }
}

/** Bảng thông tin trích xuất, nhóm theo phần của mẫu hợp đồng (contract_schema từ Back-End). */
export function ExtractedData({ data, schema, className }) {
  if (!data || !schema) return null;
  const sections = Object.entries(schema.sections ?? {});
  return (
    <div className={cn("grid gap-4", className)}>
      {sections.map(([key, title]) => {
        const fields = schema.fields.filter((f) => f.section === key);
        if (!fields.length) return null;
        return (
          <section key={key} className="rounded-xl border border-border/70">
            <h4 className="border-b border-border/70 bg-muted/40 px-3.5 py-2 text-[12.5px] font-semibold tracking-wide text-muted-foreground">{title}</h4>
            <dl className="grid divide-y divide-border/50">
              {fields.map((f) => {
                const v = displayValue(f, data[f.key]);
                const multiline = f.key === "commitments" || (typeof v === "string" && v.includes("\n"));
                return (
                  <div key={f.key} className="grid gap-1 px-3.5 py-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-3">
                    <dt className="text-[12.5px] text-muted-foreground">
                      {f.label}
                      {f.required && <span className="text-destructive"> *</span>}
                    </dt>
                    <dd className={cn("text-[13.5px] break-words", v ? "text-foreground" : "text-muted-foreground/70 italic", multiline && "whitespace-pre-line")}>
                      {v ?? "— chưa có —"}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chọn file                                                            */
/* ------------------------------------------------------------------ */

/** Ô chọn file (bấm hoặc kéo thả). `accept` kiểu input[type=file]. */
export function FilePicker({ label, hint, accept, file, onChange, required, disabled }) {
  const id = useId();
  const input = useRef(null);
  const onDrop = (e) => {
    e.preventDefault();
    if (disabled) return;
    const f = e.dataTransfer.files?.[0];
    if (f) onChange(f);
  };
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-[13.5px] font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={cn(
          "relative flex items-center gap-3 rounded-xl border border-dashed border-input bg-muted/30 px-3.5 py-3 transition-colors",
          !disabled && "hover:border-foreground/30 hover:bg-muted/60",
          file && "border-solid border-primary/40 bg-primary/5",
        )}
      >
        <FileUp className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="grid min-w-0 flex-1">
          <span className="truncate text-[13.5px]">{file ? file.name : "Bấm để chọn hoặc kéo thả file vào đây"}</span>
          <span className="text-[12px] text-muted-foreground">{file ? `${(file.size / 1024).toFixed(0)} KB` : hint}</span>
        </span>
        {file && !disabled && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (input.current) input.current.value = "";
            }}
            className="relative z-10 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Bỏ chọn ${label}`}
          >
            <X className="size-4" />
          </button>
        )}
        <input
          ref={input}
          id={id}
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          className={cn("absolute inset-0 cursor-pointer opacity-0", file && "right-10")}
        />
      </div>
    </div>
  );
}

export const DOCX_ACCEPT = ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const SCAN_ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
