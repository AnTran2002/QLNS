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

/** URL tuyệt đối tới một action của Back-End (dùng cho link tải file — cùng origin nên gửi kèm cookie). */
export const apiFileUrl = (action, params = {}) => {
  const q = new URLSearchParams({ action, ...params });
  return `${API_BASE_URL.replace(/\/$/, "")}/?${q.toString()}`;
};

/** Tải file nhị phân (DOCX/PDF) qua API; lỗi JSON từ Back-End được đọc ra thành ApiError. */
async function downloadFile(action, params, fallbackName) {
  try {
    const res = await http.request({ url: "/", params: { action, ...params }, responseType: "blob", timeout: 30000 });
    const type = res.headers["content-type"] || "";
    if (type.includes("application/json")) {
      const body = JSON.parse(await res.data.text());
      throw new ApiError(body.message || "Không tải được file", res.status);
    }
    const disposition = res.headers["content-disposition"] || "";
    const match = disposition.match(/filename="?([^";]+)"?/i);
    const name = match ? decodeURIComponent(match[1]) : fallbackName;
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return name;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.response?.data instanceof Blob) {
      try {
        const body = JSON.parse(await err.response.data.text());
        throw new ApiError(body.message || "Không tải được file", err.response.status);
      } catch (inner) {
        if (inner instanceof ApiError) throw inner;
      }
    }
    throw new ApiError(err.response ? `Không tải được file (HTTP ${err.response.status}).` : "Không thể kết nối máy chủ.", err.response?.status ?? 0);
  }
}

function multipart(fields) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null && v !== "") form.append(k, v instanceof Blob ? v : String(v));
  }
  return form;
}

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
    payload.allowance = e.allowance;
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
  createLeave: ({ type, personal_event, start_date, end_date, reason }) =>
    callApi("employee/leave", {
      method: "POST",
      data: { type, ...(personal_event ? { personal_event } : {}), start_date, end_date, reason },
    }),
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

  // ---- Danh mục dùng chung từ CSDL (MetaController) ----
  /** Chi nhánh, phòng ban, ENUM trạng thái, ngày lễ, tham số luật tính lương, cấu trúc hợp đồng… */
  meta: () => callApi("meta"),

  // ---- Lương tạm tính theo tiến trình chấm công ----
  payrollEstimate: (month) => callApi("employee/payroll-estimate", { params: month ? { month } : undefined }),
  notifications: (unreadOnly = false) =>
    callApi("employee/notifications", { params: unreadOnly ? { unread: 1 } : undefined }).then((d) => ({
      notifications: toNumberList(d?.notifications),
      unread_count: Number(d?.unread_count ?? 0),
    })),
  markNotificationRead: (id = null) =>
    callApi("employee/notifications", {
      method: "POST",
      data: id === null ? {} : { id },
    }),

  // ---- Hướng dẫn lần đầu đăng nhập ----
  completeTutorial: () => callApi("tutorial/complete", { method: "POST" }),
  resetTutorial: () => callApi("tutorial/reset", { method: "POST" }),

  // ---- Hồ sơ hợp đồng: tải lên → đọc → kiểm tra pháp lý → duyệt tạo tài khoản ----
  downloadContractTemplate: () => downloadFile("contracts/template", {}, "Mau-hop-dong-lao-dong-PeopleOS.docx"),
  contractDocuments: (status) => callApi("contracts/documents", { params: status ? { status } : undefined }),
  contractDocument: (id) => callApi("contracts/documents/show", { params: { id } }),
  uploadContractDocument: ({ contract, scan }) =>
    callApi("contracts/documents/upload", { method: "POST", data: multipart({ contract, scan }), timeout: 60000 }),
  attachContractScan: (id, scan) =>
    callApi("contracts/documents/scan", { method: "POST", data: multipart({ id, scan }), timeout: 60000 }),
  downloadContractFile: (id, kind) => downloadFile("contracts/documents/file", { id, kind }, kind === "scan" ? "scan" : "hop-dong.docx"),
  contractFileUrl: (id, kind) => apiFileUrl("contracts/documents/file", { id, kind }),
  approveContractDocument: (id, note) => callApi("contracts/documents/approve", { method: "POST", data: { id, note } }),
  rejectContractDocument: (id, note) => callApi("contracts/documents/reject", { method: "POST", data: { id, note } }),
};
