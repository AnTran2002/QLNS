import { EMPLOYEE_STATUSES } from "@/lib/constants";

/** Gom nhân viên theo cột users.department */
export function groupByDepartment(employees = []) {
  const map = new Map();
  for (const e of employees) {
    const key = e.department || "Chưa phân phòng";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(e);
  }
  return [...map.entries()]
    .map(([name, members]) => ({
      name,
      members,
      payroll: members.reduce((s, m) => s + m.base_salary + m.allowance, 0),
      byStatus: Object.fromEntries(EMPLOYEE_STATUSES.map((s) => [s, members.filter((m) => m.status === s).length])),
    }))
    .sort((a, b) => b.members.length - a.members.length || a.name.localeCompare(b.name, "vi"));
}
