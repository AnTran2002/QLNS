import { callApi } from "@/lib/api-client";

/** Chỉ gửi các trường backend nhận, tránh gửi thừa (id, role, contract_id...). */
function toPayload(e) {
  return {
    employee_code: e.employee_code,
    full_name: e.full_name,
    email: e.email,
    department: e.department,
    position: e.position,
    status: e.status,
    joined_at: e.joined_at,
    base_salary: e.base_salary,
    insurance_salary: e.insurance_salary,
    allowance: e.allowance,
    dependents_count: e.dependents_count,
  };
}

/** API quản lý nhân viên + hợp đồng (chỉ role ADMIN). */
export const employeesApi = {
  list: () => callApi("employees"),
  get: (id) => callApi("employees/show", { params: { id } }),
  create: (employee) =>
    callApi("employees/create", { method: "POST", data: toPayload(employee) }),
  update: (id, employee) =>
    callApi("employees/update", {
      method: "PUT",
      params: { id },
      data: toPayload(employee),
    }),
  remove: (id) =>
    callApi("employees/delete", { method: "DELETE", params: { id } }),
};
