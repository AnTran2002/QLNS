import { BadgeCheck, Briefcase, CalendarDays, FileSignature, Info, Mail } from "lucide-react";
import { ErrorState, EmployeeStatusBadge, LoadingState } from "@/components/app/kit";
import { AvatarEditor } from "@/components/employee/avatar-editor";
import { Reveal } from "@/components/app/motion";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useEmployeeDashboard } from "@/hooks/use-employee-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { useMeta } from "@/hooks/use-meta";
import { ROLES } from "@/lib/constants";
import { formatDate, formatMoney, formatNumber, tenureLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Một dòng nhãn — giá trị, căn hai bên như bảng thông tin của shadcn dashboard. */
function Field({ label, children, mono, className }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5 max-[380px]:flex-col", className)}>
      <dt className="shrink-0 text-[13px] text-muted-foreground">{label}</dt>
      <dd className={cn("min-w-0 text-right text-[13.5px] font-medium break-words tabular-nums max-[380px]:text-left", mono && "font-mono text-[13px]")}>
        {children ?? "Chưa cập nhật"}
      </dd>
    </div>
  );
}

/* Lương cơ bản = màu nhấn, phụ cấp = màu phụ — thứ tự giống bảng màu biểu đồ. */
function IncomeStructure({ base, allowance }) {
  const total = base + allowance;
  const parts = [
    { key: "base", label: "Lương cơ bản", value: base, color: "var(--chart-1)" },
    { key: "allowance", label: "Phụ cấp cố định", value: allowance, color: "var(--chart-2)" },
  ].filter((p) => p.value > 0);
  if (!total) return null;
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <p className="text-[12.5px] text-muted-foreground">Thu nhập cố định / tháng</p>
        <p className="font-display text-[20px] font-semibold tracking-[-0.02em] tabular-nums">{formatMoney(total)}</p>
      </div>
      <div className="grow-x flex h-2 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Cơ cấu thu nhập cố định">
        {parts.map((p) => (
          <span key={p.key} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-1.5">
            <span className="size-2 rounded-[3px]" style={{ background: p.color }} aria-hidden="true" />
            {p.label} · {formatNumber((p.value / total) * 100)}%
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function EmployeeProfile() {
  const { data, isPending, error, refetch } = useEmployeeDashboard();
  const { user: authUser } = useAuth();
  const { payroll: rules, contractTypes } = useMeta();
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isPending) return <LoadingState rows={4} />;

  const { contract } = data;
  // Hồ sơ đầy đủ (CCCD, ngày sinh, MST…) lấy từ phiên `me`; dashboard chỉ trả phần tóm tắt.
  const user = { ...(authUser ?? {}), ...data.user_info };
  const insuranceRate = rules?.insurance_rate ?? 0;
  const insurance = contract ? contract.insurance_salary * insuranceRate : 0;
  const familyDeduction = contract && rules
    ? rules.personal_deduction + (contract.dependents_count || 0) * rules.dependent_deduction
    : 0;
  const probationEnd = contract?.probation_days > 0 && contract.start_date
    ? new Date(new Date(`${contract.start_date}T00:00:00`).getTime() + contract.probation_days * 86400000).toISOString().slice(0, 10)
    : null;

  return (
    <div className="space-y-6">
      <header>
        <Reveal offset={8}>
          <h1 className="page-title">Hồ sơ</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">Thông tin cá nhân và hợp đồng lao động hiện hành.</p>
        </Reveal>
      </header>

      <Reveal delay={60} offset={12}>
        <Card className="py-8 sm:py-10">
          <CardContent className="flex flex-col items-center gap-5 text-center">
            <AvatarEditor user={user} />
            <div className="min-w-0 space-y-1.5">
              <h2 className="font-display text-[clamp(1.375rem,1.15rem+0.8vw,1.75rem)] leading-tight font-semibold tracking-[-0.022em] break-words">
                {user.full_name}
              </h2>
              <p className="text-[14px] text-muted-foreground">
                {user.position || "Chưa cập nhật chức danh"} · {user.department}
              </p>
              <div className="pt-1">
                <EmployeeStatusBadge status={user.status} />
              </div>
            </div>
            <dl className="grid w-full max-w-xl grid-cols-1 gap-2 pt-1 min-[460px]:grid-cols-3 min-[460px]:gap-0 min-[460px]:divide-x min-[460px]:divide-border/70">
              {[
                [BadgeCheck, "Mã nhân viên", <span key="c" className="font-mono">{user.employee_code}</span>],
                [CalendarDays, "Ngày vào làm", formatDate(user.joined_at)],
                [Briefcase, "Thâm niên", tenureLabel(user.joined_at)],
              ].map(([Icon, k, v]) => (
                <div
                  key={k}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-muted/50 px-3.5 py-2.5 min-[460px]:flex-col min-[460px]:justify-start min-[460px]:gap-1 min-[460px]:rounded-none min-[460px]:bg-transparent min-[460px]:px-3 min-[460px]:py-0"
                >
                  <dt className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                    <Icon className="size-3.5" aria-hidden="true" />
                    {k}
                  </dt>
                  <dd className="truncate text-[14px] font-medium tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </Reveal>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5 [&>*]:min-w-0">
        <Reveal delay={110} offset={14} className="h-full lg:col-span-2">
          <Card className="h-full gap-3">
            <CardHeader>
              <CardTitle>Thông tin cá nhân</CardTitle>
              <CardDescription>Theo hồ sơ phòng nhân sự</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border/70">
                <Field label="Họ và tên">{user.full_name}</Field>
                <Field label="Mã nhân viên" mono>{user.employee_code}</Field>
                <Field label="Email công ty">
                  <a href={`mailto:${user.email}`} className="inline-flex max-w-full items-center gap-1.5 break-all hover:underline">
                    <Mail className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    {user.email}
                  </a>
                </Field>
                <Field label="Điện thoại" mono>{user.phone || null}</Field>
                <Field label="Ngày sinh">{user.date_of_birth ? formatDate(user.date_of_birth) : null}</Field>
                <Field label="Giới tính">{user.gender || null}</Field>
                <Field label="Số CCCD" mono>{user.national_id || null}</Field>
                <Field label="Ngày cấp · Nơi cấp">
                  {user.national_id_issued_date ? `${formatDate(user.national_id_issued_date)} · ${user.national_id_issued_place ?? ""}` : null}
                </Field>
                <Field label="Địa chỉ thường trú">{user.address || null}</Field>
                <Field label="Mã số thuế cá nhân" mono>{user.tax_code || null}</Field>
                <Field label="Vai trò">{ROLES[user.role] ?? user.role}</Field>
                <Field label="Chi nhánh">{user.branch_name || null}</Field>
                <Field label="Phòng ban">{user.department}</Field>
                <Field label="Chức danh">{user.position || null}</Field>
                <Field label="Trạng thái">{user.status}</Field>
              </dl>
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={160} offset={14} className="h-full lg:col-span-3">
          <Card className="h-full gap-4">
            <CardHeader>
              <CardTitle>Hợp đồng lao động</CardTitle>
              <CardDescription>
                {contract
                  ? `${contractTypes[contract.contract_type] ?? "Hợp đồng lao động"} · ký ngày ${formatDate(contract.signed_date ?? contract.created_at)}`
                  : "Chưa có hợp đồng"}
              </CardDescription>
              {contract && (
                <CardAction>
                  <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[12px]">
                    <FileSignature className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    {contract.contract_number || `HĐ-${String(contract.id).padStart(3, "0")}`}
                  </span>
                </CardAction>
              )}
            </CardHeader>
            {contract ? (
              <>
                <CardContent className="space-y-5">
                  <IncomeStructure base={Number(contract.base_salary) || 0} allowance={Number(contract.allowance) || 0} />
                  <dl className="grid divide-y divide-border/70 xl:grid-cols-2 xl:gap-x-8 xl:divide-y-0">
                    <Field label="Lương cơ bản" className="xl:border-b xl:border-border/70">{formatMoney(contract.base_salary)}</Field>
                    <Field label="Phụ cấp cố định" className="xl:border-b xl:border-border/70">{formatMoney(contract.allowance)}</Field>
                    <Field label="Lương đóng BHXH">{formatMoney(contract.insurance_salary)}</Field>
                    <Field label="Người phụ thuộc">{contract.dependents_count} người</Field>
                  </dl>
                  {contract.start_date && (
                    <dl className="grid divide-y divide-border/70 rounded-lg border px-3.5 xl:grid-cols-2 xl:gap-x-8 xl:divide-y-0">
                      <Field label="Hiệu lực từ">{formatDate(contract.start_date)}</Field>
                      <Field label="Đến ngày">{contract.end_date ? formatDate(contract.end_date) : "Không xác định thời hạn"}</Field>
                      <Field label="Thử việc">
                        {contract.probation_days > 0
                          ? `${contract.probation_days} ngày · hưởng ${formatNumber(contract.probation_salary_rate * 100)}% lương${probationEnd ? ` · đến ${formatDate(probationEnd)}` : ""}`
                          : "Không thử việc"}
                      </Field>
                      <Field label="Vị trí công việc">{contract.job_title || user.position}</Field>
                      <Field label="Thời giờ làm việc">
                        {contract.working_hours_per_day ? `${formatNumber(contract.working_hours_per_day)} giờ/ngày · ${contract.working_days_per_week} ngày/tuần` : null}
                      </Field>
                      <Field label="Nghỉ phép năm">{contract.annual_leave_days ? `${contract.annual_leave_days} ngày/năm` : null}</Field>
                      <Field label="Hình thức trả lương">{contract.payment_method || null}</Field>
                      <Field label="Ngày trả lương">{contract.pay_day ? `Ngày ${contract.pay_day} hằng tháng` : null}</Field>
                    </dl>
                  )}
                  {contract.commitments && (
                    <div className="rounded-lg border bg-muted/30 p-3.5">
                      <p className="text-[12px] font-medium text-muted-foreground">Cam kết & điều khoản riêng</p>
                      <ul className="mt-2 space-y-1.5 text-[13px] text-foreground/90">
                        {contract.commitments.split("\n").filter(Boolean).map((line) => (
                          <li key={line} className="flex gap-2">
                            <span className="mt-[7px] size-1 shrink-0 rounded-full bg-muted-foreground" aria-hidden="true" />
                            <span className="min-w-0 break-words">{line}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border bg-muted/40 p-3.5">
                      <p className="text-[12px] text-muted-foreground">BHXH · BHYT · BHTN trích hằng tháng</p>
                      <p className="mt-1 text-[17px] font-semibold tabular-nums">{formatMoney(insurance)}</p>
                      <p className="text-[11.5px] text-muted-foreground">
                        {formatNumber(insuranceRate * 100)}% × lương đóng bảo hiểm
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/40 p-3.5">
                      <p className="text-[12px] text-muted-foreground">Giảm trừ gia cảnh / tháng</p>
                      <p className="mt-1 text-[17px] font-semibold tabular-nums">{formatMoney(familyDeduction)}</p>
                      <p className="text-[11.5px] text-muted-foreground">
                        Bản thân + {contract.dependents_count} người phụ thuộc
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="mt-auto">
                  <p className="flex items-start gap-2 text-[12.5px] text-muted-foreground">
                    <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                    Cần điều chỉnh thông tin hoặc người phụ thuộc? Liên hệ phòng nhân sự để cập nhật hợp đồng.
                  </p>
                </CardFooter>
              </>
            ) : (
              <CardContent className="flex flex-1 items-center justify-center py-10 text-center text-[13px] text-muted-foreground">
                Chưa có hợp đồng trong hệ thống. Liên hệ phòng nhân sự để được hỗ trợ.
              </CardContent>
            )}
          </Card>
        </Reveal>
      </div>
    </div>
  );
}
