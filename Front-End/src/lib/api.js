import axios from "axios";

/**
 * Lớp gọi API Back-End PHP.
 *
 * Back-End định tuyến bằng query `?action=...` (Back-End/routes/index.php) và trả JSON
 *   { success: boolean, data: any, message: string }
 * `callApi` trả về `data`, hoặc ném `ApiError` mang đúng `message` của Back-End.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const http = axios.create({
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

export async function callApi(action, { method = "GET", data, params, timeout } = {}) {
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

/** Link tải phiếu lương HTML (UC-03) — chỉ kỳ LOCKED/PAID, gửi kèm cookie phiên vì cùng origin. */
export const payslipDownloadUrl = (periodId) =>
  `${API_BASE_URL.replace(/\/$/, "")}/?action=payroll/payslip/download&period_id=${encodeURIComponent(periodId)}`;

/** Ép các trường số (Back-End có chỗ trả DECIMAL dạng chuỗi) về number. */
const MONEY_FIELDS = [
  "base_salary", "insurance_salary", "allowance", "dependents_count",
  "gross_salary", "social_insurance", "tax_deduction", "personal_tax", "net_salary",
  "actual_days", "ot_hours", "standard_days",
  "items_count", "total_gross", "total_net",
];
export function toNumbers(row) {
  if (!row || typeof row !== "object") return row;
  const out = { ...row };
  for (const key of MONEY_FIELDS) {
    if (key in out && out[key] !== null && out[key] !== "") out[key] = Number(out[key]);
  }
  return out;
}
const toNumberList = (rows) => (Array.isArray(rows) ? rows.map(toNumbers) : []);

/** Chỉ gửi các trường mà EmployeeController::validate() nhận. */
function employeePayload(e) {
  const payload = {
    employee_code: e.employee_code,
    full_name: e.full_name,
    email: e.email,
    department: e.department,
    position: e.position,
    status: e.status,
    joined_at: e.joined_at,
    base_salary: Number(e.base_salary) || 0,
    insurance_salary: Number(e.insurance_salary) || 0,
    allowance: Number(e.allowance) || 0,
    dependents_count: Number(e.dependents_count) || 0,
  };
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

  // ---- Hồ sơ của chính mình ----
  /** `avatar` là data URL (đã thu nhỏ) hoặc null để xoá. */
  updateAvatar: (avatar) => callApi("profile/avatar", { method: "POST", data: { avatar } }),

  // ---- Quản lý nhân viên (ADMIN) ----
  employees: () => callApi("employees").then(toNumberList),
  createEmployee: (e) => callApi("employees/create", { method: "POST", data: employeePayload(e) }),
  updateEmployee: (id, e) =>
    callApi("employees/update", { method: "PUT", params: { id }, data: employeePayload(e) }),
  deleteEmployee: (id) => callApi("employees/delete", { method: "DELETE", params: { id } }),

  // ---- Hợp đồng (ContractController) ----
  contracts: () => callApi("contracts").then(toNumberList),
  updateContract: (id, c) =>
    callApi("contracts/update", {
      method: "PUT",
      params: { id },
      data: {
        base_salary: Number(c.base_salary) || 0,
        insurance_salary: Number(c.insurance_salary) || 0,
        allowance: Number(c.allowance) || 0,
        dependents_count: Number(c.dependents_count) || 0,
      },
    }).then(toNumbers),

  // ---- Bảng lương (PayrollController, ADMIN) ----
  payrollPeriods: () => callApi("payroll/periods").then(toNumberList),
  payrollItems: (periodId) => callApi("payroll/items", { params: { period_id: periodId } }),

  // ---- UC-02: Nhập liệu bảng công & OT ----
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
  /** Lưu chỉnh sửa thủ công trên Grid: entries = [{ user_id, actual_days, ot_hours }]. */
  saveAttendance: (periodId, entries) =>
    callApi("payroll/attendance", {
      method: "PUT",
      data: {
        period_id: periodId,
        entries: entries.map((e) => ({
          user_id: e.user_id,
          actual_days: Number(e.actual_days),
          ot_hours: Number(e.ot_hours),
        })),
      },
    }),
  /** Import file Excel công (.xlsx): cột Mã NV · Ngày công · Giờ OT. */
  importAttendance: (periodId, file) => {
    const form = new FormData();
    form.append("period_id", String(periodId));
    form.append("file", file);
    return callApi("payroll/import", { method: "POST", data: form, timeout: 60000 });
  },
  calculatePayroll: ({ user_id, period_id, actual_days, ot_hours }) =>
    callApi("payroll/calculate", {
      method: "POST",
      data: { user_id, period_id, actual_days: Number(actual_days), ot_hours: Number(ot_hours) },
    }),
};
