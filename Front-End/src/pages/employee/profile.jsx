import { motion } from "motion/react";
import { ErrorState, EmployeeStatusBadge, InfoItem, LoadingState, PageHeader, PersonAvatar } from "@/components/app/kit";
import { Money, Reveal, SPRING } from "@/components/app/motion";
import { useEmployeeDashboard } from "@/hooks/use-employee-dashboard";
import { PAYROLL_RULES, ROLES } from "@/lib/constants";
import { formatDate, formatMoney, tenureLabel } from "@/lib/format";

export default function EmployeeProfile() {
  const { data, isPending, error, refetch } = useEmployeeDashboard();
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isPending) return <LoadingState rows={4} />;

  const { user_info: user, contract } = data;
  const familyDeduction = contract
    ? PAYROLL_RULES.personalDeduction + contract.dependents_count * PAYROLL_RULES.dependentDeduction
    : 0;

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Hồ sơ" title="Hồ sơ & hợp đồng" description="Thông tin cá nhân và hợp đồng lao động hiện hành. Liên hệ phòng nhân sự nếu cần điều chỉnh." />

      <Reveal delay={80}>
        <section className="card flex flex-col items-center gap-5 p-8 text-center md:flex-row md:p-10 md:text-left">
          <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...SPRING, delay: 0.15 }}>
            <PersonAvatar name={user.full_name} seed={user.employee_code} size="xl" />
          </motion.div>
          <div className="flex-1 space-y-2">
            <h2 className="font-display text-[28px] leading-tight font-semibold tracking-[-0.03em] text-foreground md:text-[34px]">{user.full_name}</h2>
            <p className="text-[17px] text-muted-foreground">{user.position} · {user.department}</p>
          </div>
          <EmployeeStatusBadge status={user.status} className="text-[13px]" />
        </section>
      </Reveal>

      <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
        <Reveal delay={140} className="h-full">
          <section className="card h-full p-7 md:p-8">
            <h3 className="text-eyebrow">Thông tin cá nhân</h3>
            <dl className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <InfoItem label="Mã nhân viên" mono>{user.employee_code}</InfoItem>
              <InfoItem label="Vai trò">{ROLES[user.role] ?? user.role}</InfoItem>
              <InfoItem label="Email công ty" className="break-all sm:col-span-2">{user.email}</InfoItem>
              <InfoItem label="Phòng ban">{user.department}</InfoItem>
              <InfoItem label="Chức danh">{user.position || "Chưa cập nhật"}</InfoItem>
              <InfoItem label="Ngày vào làm">{formatDate(user.joined_at)}</InfoItem>
              <InfoItem label="Thâm niên">{tenureLabel(user.joined_at)}</InfoItem>
            </dl>
          </section>
        </Reveal>

        <Reveal delay={200} className="h-full">
          <section className="card h-full p-7 md:p-8">
            <h3 className="text-eyebrow">Hợp đồng lao động</h3>
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
                <div className="tile mt-7 grid gap-4 p-5 sm:grid-cols-2">
                  <div>
                    <p className="text-[13px] text-tile-muted">BHXH trích hằng tháng (10,5%)</p>
                    <Money value={contract.insurance_salary * PAYROLL_RULES.insuranceRate} className="mt-1 text-[20px] font-semibold" />
                  </div>
                  <div>
                    <p className="text-[13px] text-tile-muted">Giảm trừ gia cảnh</p>
                    <Money value={familyDeduction} className="mt-1 text-[20px] font-semibold" />
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-6 text-[15px] text-muted-foreground">Chưa có hợp đồng trong hệ thống.</p>
            )}
          </section>
        </Reveal>
      </div>
    </div>
  );
}
