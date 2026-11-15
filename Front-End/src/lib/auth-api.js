import { callApi } from "@/lib/api-client";

/** Xác thực qua session PHP (cookie PHPSESSID). */
export const authApi = {
  /** POST ?action=login → { user, token } */
  login: (identifier, password) =>
    callApi("login", {
      method: "POST",
      data: { employee_code: identifier, password },
    }),

  /** GET ?action=me → { user, contract, payroll_history, current_period } */
  me: () => callApi("me"),

  /** GET ?action=logout */
  logout: () => callApi("logout"),

  /** GET ?action=employee/dashboard (chỉ role EMPLOYEE) */
  employeeDashboard: () => callApi("employee/dashboard"),
};
