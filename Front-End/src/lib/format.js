const vnd = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

/** 25000000 → "25.000.000 ₫" */
export const formatMoney = (value) => `${vnd.format(Math.round(Number(value) || 0))} ₫`;

/** 25000000 → "25 tr" (dùng cho ô số liệu gọn) */
export function formatMoneyShort(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1e9) return `${num.format(n / 1e9)} tỷ`;
  if (Math.abs(n) >= 1e6) return `${num.format(n / 1e6)} tr`;
  return formatMoney(n);
}

export const formatNumber = (value) => num.format(Number(value) || 0);

/** "2026-01-02" → "02/01/2026" */
export function formatDate(value) {
  if (!value) return "Chưa cập nhật";
  const [y, m, d] = String(value).slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : String(value);
}

/** "2026-10" → "Tháng 10/2026" */
export function formatPeriod(monthYear) {
  if (!monthYear) return "—";
  const [y, m] = String(monthYear).split("-");
  return `Tháng ${Number(m)}/${y}`;
}

/** "Nguyễn Văn An" → "NA" */
export function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** "Nguyễn Văn An" → "An" (tên gọi) */
export const givenName = (name = "") => String(name).trim().split(/\s+/).pop() || "";

/** Lời chào theo giờ trong ngày */
export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 11) return "Chào buổi sáng";
  if (h < 14) return "Chào buổi trưa";
  if (h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

/** Số tháng từ ngày vào làm đến nay */
export function tenureLabel(joinedAt, now = new Date()) {
  if (!joinedAt) return "—";
  const start = new Date(`${String(joinedAt).slice(0, 10)}T00:00:00`);
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 1) return "Dưới 1 tháng";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return [years ? `${years} năm` : "", rest ? `${rest} tháng` : ""].filter(Boolean).join(" ");
}
