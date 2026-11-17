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

/** Hằng số tính lương — khớp Back-End/services/PayrollEngine.php */
export const PAYROLL_RULES = {
  insuranceRate: 0.105, // BHXH + BHYT + BHTN phần người lao động
  personalDeduction: 11_000_000,
  dependentDeduction: 4_400_000,
  otRate: 1.5,
};

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
