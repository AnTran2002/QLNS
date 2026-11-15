// Danh sách phòng ban dùng cho bộ lọc / form. Giá trị lưu ở cột users.department.
export const departments = [
  "Kỹ thuật",
  "Thiết kế",
  "Marketing",
  "Kinh doanh",
  "Nhân sự",
  "Tài chính",
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
