export const departments = [
  "Kỹ thuật",
  "Thiết kế",
  "Marketing",
  "Kinh doanh",
  "Nhân sự",
  "Tài chính",
];
const names = [
  "Nguyễn Minh Anh",
  "Trần Hoàng Nam",
  "Lê Thảo Linh",
  "Phạm Đức Huy",
  "Vũ Ngọc Hà",
  "Đặng Tuấn Kiệt",
  "Bùi Phương Anh",
  "Đỗ Quang Minh",
  "Hoàng Mai Chi",
  "Nguyễn Thanh Tùng",
  "Trần Bảo Ngọc",
  "Lê Quốc Bảo",
  "Phạm Thu Trang",
  "Vũ Hải Đăng",
  "Đặng Khánh Vy",
  "Bùi Gia Hân",
  "Đỗ Anh Tuấn",
  "Hoàng Nhật Linh",
  "Nguyễn Đức Anh",
  "Trần Mỹ Duyên",
  "Lê Minh Khang",
  "Phạm Ngọc Hân",
  "Vũ Thành Long",
  "Đặng Yến Nhi",
];
const assignments = [
  1, 0, 2, 0, 4, 3, 1, 0, 5, 3, 2, 0, 4, 0, 1, 5, 3, 2, 0, 1, 3, 2, 0, 4,
];
const positions = [
  "Frontend Developer",
  "Product Designer",
  "Marketing Specialist",
  "Sales Executive",
  "HR Specialist",
  "Financial Analyst",
];
export const seedEmployees = names.map((full_name, i) => {
  const departmentIndex = assignments[i];
  return {
    id: i + 1,
    employee_code: `NV${String(i + 1).padStart(3, "0")}`,
    full_name,
    email: `${["minhanh", "hoangnam", "thaolinh", "duchuy", "ngocha", "tuankiet"][i % 6]}${i > 5 ? i : ""}@acme.vn`,
    department: departments[departmentIndex],
    position: positions[departmentIndex],
    status:
      i === 4 || i === 16 ? "Nghỉ phép" : i > 20 ? "Thử việc" : "Đang làm việc",
    joined_at: `2026-${String(3 + Math.floor(i / 3)).padStart(2, "0")}-${String(2 + (i % 24)).padStart(2, "0")}`,
    base_salary: (15 + (i % 8) * 3) * 1000000,
    insurance_salary: 12000000,
    dependents_count: i % 3,
    allowance: 1500000,
  };
});
export const workforceHistory = [
  { month: "T6", total: 9 },
  { month: "T7", total: 12 },
  { month: "T8", total: 16 },
  { month: "T9", total: 19 },
  { month: "T10", total: 21 },
];
export const money = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
export const dateLabel = (date) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date + "T00:00:00"));
export const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((p) => p[0])
    .join("");
export function exportCsv(rows, filename) {
  if (!rows.length) return;
  const quote = (value) => {
    let str = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
    return `"${str.replaceAll('"', '""')}"`;
  };
  const keys = Object.keys(rows[0]);
  const csv =
    "\uFEFF" +
    [
      keys.map(quote).join(","),
      ...rows.map((row) => keys.map((key) => quote(row[key])).join(",")),
    ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
