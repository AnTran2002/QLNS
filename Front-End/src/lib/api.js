import axios from "axios";

/**
 * Lớp gọi API Back-End PHP.
 *
 * Back-End định tuyến bằng query `?action=...` (Back-End/routes/index.php) và trả JSON
 *   { success: boolean, data: any, message: string }
 * `callApi` trả về `data`, hoặc ném `ApiError` mang đúng `message` của Back-End.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // gửi cookie phiên PHPSESSID
  headers: { Accept: "application/json" },
  timeout: 15000,
});

export class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    /** `data` đi kèm lỗi (vd. danh sách dòng lỗi khi import Excel). */
    this.details = details;
  }
}

async function callApi(action, { method = "GET", data, params, timeout } = {}) {
  try {
    const res = await http.request({ url: "/", method, data, params: { action, ...params }, ...(timeout ? { timeout } : {}) });
    const body = res.data;
    if (!body || typeof body !== "object" || !("success" in body)) {
      throw new ApiError("Phản hồi từ Back-End không phải JSON hợp lệ. Kiểm tra BACKEND_URL trong .env.", res.status);
    }
    if (!body.success) throw new ApiError(body.message, res.status, body.data ?? null);
    return body.data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.response) {
      throw new ApiError(
        err.response.data?.message || `Yêu cầu thất bại (HTTP ${err.response.status}).`,
        err.response.status,
        err.response.data?.data ?? null,
      );
    }
    throw new ApiError("Không thể kết nối máy chủ. Hãy kiểm tra Back-End PHP đang chạy.", 0);
  }
}

/** Link tải phiếu lương HTML — chỉ kỳ LOCKED/PAID, gửi kèm cookie phiên vì cùng origin. */
export const payslipDownloadUrl = (periodId) =>
  `${API_BASE_URL.replace(/\/$/, "")}/?action=payroll/payslip/download&period_id=${encodeURIComponent(periodId)}`;

/** Ép các trường số (Back-End có chỗ trả DECIMAL dạng chuỗi) về number. */
const MONEY_FIELDS = [
  "base_salary", "insurance_salary", "allowance", "dependents_count",
  "previous_base_salary", "previous_insurance_salary", "previous_allowance", "previous_dependents_count",
  "previous_actual_days", "previous_ot_hours", "previous_gross_salary", "previous_social_insurance",
  "previous_tax_deduction", "previous_personal_tax", "previous_net_salary",
  "gross_salary", "social_insurance", "tax_deduction", "personal_tax", "net_salary",
  "actual_days", "ot_hours", "standard_days",
  "items_count", "total_gross", "total_net",
];
function toNumbers(row) {
  if (!row || typeof row !== "object") return row;
  const out = { ...row };
  for (const key of MONEY_FIELDS) {
    if (key in out && out[key] !== null && out[key] !== "") out[key] = Number(out[key]);
  }
  return out;
}
const toNumberList = (rows) => (Array.isArray(rows) ? rows.map(toNumbers) : []);

/** Chỉ gửi các trường mà EmployeeController::validate() nhận. */
function employeePayload(e, includeContract = true) {
  const payload = {
    employee_code: e.employee_code,
    full_name: e.full_name,
    email: e.email,
    department: e.department,
    position: e.position,
    status: e.status,
    joined_at: e.joined_at,
  };
  if (includeContract) {
    payload.base_salary = Number(e.base_salary) || 0;
    payload.insurance_salary = Number(e.insurance_salary) || 0;
    payload.allowance = Number(e.allowance) || 0;
    payload.dependents_count = Number(e.dependents_count) || 0;
  }
  if (e.password) payload.password = e.password;
  return payload;
}

export const api = {
  // ---- Xác thực (AuthController) ----
  login: (identifier, password) =>
    callApi("login", { method: "POST", data: { employee_code: identifier, password } }),
  me: async () => {
    const data = await callApi("me");
    return {
      ...data,
      contract: toNumbers(data.contract),
      payroll_history: toNumberList(data.payroll_history),
    };
  },
  logout: () => callApi("logout", { method: "POST" }),

  // ---- Nhân viên (EMPLOYEE) ----
  employeeDashboard: () => callApi("employee/dashboard"),
  /** Chấm công theo ngày của tháng `YYYY-MM` (bỏ trống → tháng mới nhất có dữ liệu). */
  employeeAttendance: (month) =>
    callApi("employee/attendance", { params: month ? { month } : undefined }).then((d) => ({
      ...d,
      records: (d.records ?? []).map((r) => ({ ...r, work_hours: Number(r.work_hours) || 0, ot_hours: Number(r.ot_hours) || 0 })),
    })),

  // ---- Nghỉ phép (LeaveController, migration 005) ----
  /** { available, balance: { year, quota, used, pending, remaining }, requests } */
  myLeave: () => callApi("employee/leave"),
  createLeave: ({ type, start_date, end_date, reason }) =>
    callApi("employee/leave", { method: "POST", data: { type, start_date, end_date, reason } }),
  cancelLeave: (id) => callApi("employee/leave/cancel", { method: "POST", params: { id } }),
  leaveRequests: (status) => callApi("leave/requests", { params: status ? { status } : undefined }),
  /** decision: "APPROVED" | "REJECTED" (từ chối bắt buộc có ghi chú). */
  reviewLeave: (id, decision, note) => callApi("leave/review", { method: "POST", params: { id }, data: { decision, note } }),

  // ---- Hồ sơ của chính mình ----
  /** `avatar` là data URL (đã thu nhỏ) hoặc null để xoá. */
  updateAvatar: (avatar) => callApi("profile/avatar", { method: "POST", data: { avatar } }),

  // ---- Quản lý nhân viên (ADMIN) ----
  employees: () => callApi("employees").then(toNumberList),
  createEmployee: (e) => callApi("employees/create", { method: "POST", data: employeePayload(e) }),
  updateEmployee: (id, e) =>
    callApi("employees/update", { method: "PUT", params: { id }, data: employeePayload(e, false) }),
  deleteEmployee: (id) => callApi("employees/delete", { method: "DELETE", params: { id } }),

  // ---- Hợp đồng (ContractController) ----
  contracts: () => callApi("contracts").then(toNumberList),
  salaryAdjustments: (contractId) =>
    callApi("contracts/adjustments", { params: { contract_id: contractId } }).then(toNumberList),
  createSalaryAdjustment: (contractId, adjustment) =>
    callApi("contracts/adjustments", {
      method: "POST",
      params: { contract_id: contractId },
      data: {
        base_salary: Number(adjustment.base_salary),
        insurance_salary: Number(adjustment.insurance_salary),
        allowance: Number(adjustment.allowance),
        dependents_count: Number(adjustment.dependents_count),
        reason: adjustment.reason,
      },
    }).then(toNumbers),

  // ---- Bảng lương (PayrollController, ADMIN) ----
  payrollPeriods: () => callApi("payroll/periods").then(toNumberList),
  payrollItems: (periodId) => callApi("payroll/items", { params: { period_id: periodId } }),

  // ---- Chấm công & OT ----
  /** Tạo kỳ lương mới (Tháng/Năm) — month_year dạng "YYYY-MM". */
  createPayrollPeriod: ({ month_year, standard_days }) =>
    callApi("payroll/periods", {
      method: "POST",
      data: { month_year, standard_days: Number(standard_days) },
    }).then(toNumbers),
  /** Lưới chấm công của một kỳ: mọi nhân viên + ngày công / giờ OT đã nhập (nếu có). */
  payrollAttendance: (periodId) =>
    callApi("payroll/attendance", { params: { period_id: periodId } }).then((d) => ({
      period: toNumbers(d?.period),
      items: toNumberList(d?.items),
    })),
  /** Lưu giờ OT kèm lý do riêng từng nhân viên; ngày công lấy từ chấm công theo ngày. */
  saveAttendance: (periodId, entries) =>
    callApi("payroll/attendance", {
      method: "PUT",
      data: {
        period_id: periodId,
        entries: entries.map((e) => ({ user_id: e.user_id, ot_hours: Number(e.ot_hours), reason: e.reason })),
      },
    }),
  payrollChanges: (periodId, userId) =>
    callApi("payroll/changes", { params: { period_id: periodId, user_id: userId } }).then(toNumberList),
  /** Import file Excel OT (.xlsx): cột Mã NV · Giờ OT · Lý do. */
  importAttendance: (periodId, file) => {
    const form = new FormData();
    form.append("period_id", String(periodId));
    form.append("file", file);
    return callApi("payroll/import", { method: "POST", data: form, timeout: 60000 });
  },
  calculatePayroll: ({ user_id, period_id, ot_hours, reason }) =>
    callApi("payroll/calculate", {
      method: "POST",
      data: { user_id, period_id, ot_hours: Number(ot_hours), reason },
    }),
  runPayroll: (periodId, reasons) =>
    callApi("payroll/run", { method: "POST", data: { period_id: periodId, reasons } }),
};
