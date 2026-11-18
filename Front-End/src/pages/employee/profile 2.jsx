import { ErrorState, EmployeeStatusBadge, InfoItem, LoadingBlock, PageHeader, PersonAvatar } from "@/components/app/shared";
import { useEmployeeDashboard } from "@/hooks/use-employee-dashboard";
import { PAYROLL_RULES, ROLES } from "@/lib/constants";
import { formatDate, formatMoney, tenureLabel } from "@/lib/format";

export default function EmployeeProfile() {
  const { data, isPending, error, refetch } = useEmployeeDashboard();
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isPending) return <LoadingBlock rows={4} />;

  const { user_info: user, contract } = data;
  const familyDeduction = contract
    ? PAYROLL_RULES.personalDeduction + contract.dependents_count * PAYROLL_RULES.dependentDeduction
    : 0;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Hồ sơ" title="Hồ sơ & hợp đồng" description="Thông tin cá nhân và hợp đồng lao động hiện hành. Liên hệ phòng nhân sự nếu cần điều chỉnh." />

      <section className="flex flex-col gap-6 rounded-xl border border-hairline p-6 md:flex-row md:items-center md:p-8">
        <PersonAvatar name={user.full_name} seed={user.employee_code} size="lg" className="size-20 text-[24px]" />
        <div className="flex-1 space-y-2">
          <h2 className="display-sm">{user.full_name}</h2>
          <p className="text-[15px] text-muted-foreground">{user.position} · {user.department}</p>
          <EmployeeStatusBadge status={user.status} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-hairline p-6 md:p-8">
          <h3 className="caption-upper text-muted-foreground">Thông tin cá nhân</h3>
          <dl className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <InfoItem label="Mã nhân viên" mono>{user.employee_code}</InfoItem>
            <InfoItem label="Vai trò">{ROLES[user.role] ?? user.role}</InfoItem>
            <div className="sm:col-span-2"><InfoItem label="Email công ty">{user.email}</InfoItem></div>
            <InfoItem label="Phòng ban">{user.department}</InfoItem>
            <InfoItem label="Chức danh">{user.position || "Chưa cập nhật"}</InfoItem>
            <InfoItem label="Ngày vào làm">{formatDate(user.joined_at)}</InfoItem>
            <InfoItem label="Thâm niên">{tenureLabel(user.joined_at)}</InfoItem>
          </dl>
        </section>

        <section className="rounded-xl bg-surface-card p-6 md:p-8">
          <h3 className="caption-upper text-muted-foreground">Hợp đồng lao động</h3>
          {contract ? (
            <>
              <dl className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <InfoItem label="Số hợp đồng" mono>HĐ-{String(contract.id).padStart(3, "0")}</InfoItem>
                <InfoItem label="Ngày ký">{formatDate(contract.created_at)}</InfoItem>
                <InfoItem label="Lương cơ bản"><span className="tabular">{formatMoney(contract.base_salary)}</span></InfoItem>
                <InfoItem label="Lương đóng BHXH"><span className="tabular">{formatMoney(contract.insurance_salary)}</span></InfoItem>
                <InfoItem label="Phụ cấp cố định"><span className="tabular">{formatMoney(contract.allowance)}</span></InfoItem>
                <InfoItem label="Người phụ thuộc">{contract.dependents_count} người</InfoItem>
              </dl>
              <div className="mt-6 grid gap-3 rounded-lg bg-canvas p-4 text-[14px] sm:grid-cols-2">
                <div>
                  <p className="text-[13px] text-muted-foreground">BHXH trích hằng tháng (10,5%)</p>
                  <p className="tabular mt-1 font-medium text-ink">{formatMoney(contract.insurance_salary * PAYROLL_RULES.insuranceRate)}</p>
                </div>
                <div>
                  <p className="text-[13px] text-muted-foreground">Giảm trừ gia cảnh</p>
                  <p className="tabular mt-1 font-medium text-ink">{formatMoney(familyDeduction)}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-6 text-[15px] text-muted-foreground">Chưa có hợp đồng trong hệ thống.</p>
          )}
        </section>
      </div>
    </div>
  );
}
