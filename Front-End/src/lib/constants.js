/** Khớp ENUM `users.status` trong QLNS-Database.sql */
export const EMPLOYEE_STATUSES = ["Đang làm việc", "Thử việc", "Nghỉ phép"];

/** Khớp ENUM `users.role` */
export const ROLES = { ADMIN: "Quản trị viên", EMPLOYEE: "Nhân viên" };

/** Khớp ENUM `payroll_periods.status` */
export const PERIOD_STATUS = {
  DRAFT: { label: "Nháp", tone: "amber" },
  LOCKED: { label: "Đã khoá", tone: "ink" },
  PAID: { label: "Đã chi trả", tone: "success" },
};

/** Phòng ban gợi ý (cột `users.department` là varchar tự do, mặc định 'Kỹ thuật') */
export const DEPARTMENT_SUGGESTIONS = ["Nhân sự", "Kỹ thuật", "Thiết kế", "Kinh doanh", "Kế toán", "Marketing", "Vận hành"];

/** Hằng số tính lương 2026 — khớp Back-End/services/PayrollEngine.php */
export const PAYROLL_RULES = {
  insuranceRate: 0.105, // BHXH 8% + BHYT 1,5% + BHTN 1% phần người lao động
  personalDeduction: 15_500_000, // giảm trừ bản thân / tháng (từ kỳ tính thuế 2026)
  dependentDeduction: 6_200_000, // mỗi người phụ thuộc / tháng
  otRate: 1.5,
};

/** Biểu thuế TNCN lũy tiến 5 bậc (2026) — thu nhập tính thuế / tháng. */
export const TAX_BRACKETS = [
  { upTo: 10_000_000, rate: 0.05 },
  { upTo: 30_000_000, rate: 0.1 },
  { upTo: 60_000_000, rate: 0.2 },
  { upTo: 100_000_000, rate: 0.3 },
  { upTo: Infinity, rate: 0.35 },
];

/** Thuế TNCN lũy tiến từng phần trên thu nhập tính thuế. */
export function progressiveTax(taxable) {
  let tax = 0;
  let lower = 0;
  for (const { upTo, rate } of TAX_BRACKETS) {
    if (taxable <= lower) break;
    tax += (Math.min(taxable, upTo) - lower) * rate;
    lower = upTo;
  }
  return Math.round(tax);
}

/** Suy ngược thu nhập tính thuế từ số thuế đã khấu trừ (để hiển thị trên phiếu lương). */
export function taxableIncomeFromTax(tax) {
  let lower = 0;
  let acc = 0;
  for (const { upTo, rate } of TAX_BRACKETS) {
    const full = (upTo - lower) * rate;
    if (tax <= acc + full) return Math.round(lower + (tax - acc) / rate);
    acc += full;
    lower = upTo;
  }
  return 0;
}

/** Lịch làm việc — khoá theo `work_schedule` của API employee/dashboard */
export const WEEKDAYS = [
  { key: "monday", label: "Thứ Hai", short: "T2" },
  { key: "tuesday", label: "Thứ Ba", short: "T3" },
  { key: "wednesday", label: "Thứ Tư", short: "T4" },
  { key: "thursday", label: "Thứ Năm", short: "T5" },
  { key: "friday", label: "Thứ Sáu", short: "T6" },
  { key: "saturday", label: "Thứ Bảy", short: "T7" },
  { key: "sunday", label: "Chủ Nhật", short: "CN" },
];
