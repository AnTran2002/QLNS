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

const SCHEDULE_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** "08:30 - 17:30" → { end: 17*60+30 } (phút trong ngày); null nếu là ngày nghỉ */
function parseShift(value) {
  const times = String(value ?? "").match(/\d{1,2}:\d{2}/g);
  if (!times || times.length < 2) return null;
  const [h, m] = times[1].split(":").map(Number);
  return { end: h * 60 + m };
}

/**
 * Lương tạm tính của tháng hiện tại theo số ngày đã làm (tính đến thời điểm `now`).
 * Một ngày làm việc được tính là "đã làm" khi đã qua giờ kết thúc ca theo lịch.
 * Công thức khớp PayrollEngine: (lương cơ bản / công chuẩn) × ngày công; phụ cấp chia theo cùng tỉ lệ.
 */
export function monthToDateEarnings({ contract, schedule = {}, period, joinedAt, now = new Date() }) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthYear = `${year}-${String(month + 1).padStart(2, "0")}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const minutesNow = now.getHours() * 60 + now.getMinutes();

  const joined = joinedAt ? new Date(`${String(joinedAt).slice(0, 10)}T00:00:00`) : null;

  let workDaysInMonth = 0;
  let workedDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const shift = parseShift(schedule[SCHEDULE_KEYS[date.getDay()]]);
    if (!shift) continue;
    workDaysInMonth += 1;
    if (joined && date < joined) continue;
    if (d < now.getDate() || (d === now.getDate() && minutesNow >= shift.end)) workedDays += 1;
  }

  const standardDays = period?.month_year === monthYear && Number(period.standard_days) > 0 ? Number(period.standard_days) : workDaysInMonth;
  const base = Number(contract?.base_salary) || 0;
  const allowance = Number(contract?.allowance) || 0;
  const dailyRate = standardDays > 0 ? (base + allowance) / standardDays : 0;
  const days = Math.min(workedDays, standardDays);

  return { monthYear, workedDays: days, standardDays, dailyRate, earned: dailyRate * days };
}
