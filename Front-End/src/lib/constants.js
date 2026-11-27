/**
 * Nhãn hiển thị cố định của giao diện. Danh mục nghiệp vụ (trạng thái, phòng ban, chi nhánh, tham số lương…)
 * KHÔNG khai báo ở đây — đọc từ CSDL qua useMeta() (?action=meta).
 */

/** Khớp ENUM `users.role` */
export const ROLES = { ADMIN: "Quản trị viên", EMPLOYEE: "Nhân viên" };

/** Khớp ENUM `payroll_periods.status` */
export const PERIOD_STATUS = {
  DRAFT: { label: "Nháp", tone: "amber" },
  LOCKED: { label: "Đã khoá", tone: "ink" },
  PAID: { label: "Đã chi trả", tone: "success" },
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
