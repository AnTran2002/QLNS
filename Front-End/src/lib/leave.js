/* Nghỉ phép — khớp Back-End/services/LeavePolicy.php (Back-End là nơi kiểm tra cuối cùng). */

export const LEAVE_TYPES = {
  ANNUAL: { label: "Phép năm", hint: "Trừ vào quỹ 12 ngày/năm (Điều 113 BLLĐ 2019)" },
  SICK: { label: "Nghỉ ốm", hint: "BHXH chi trả, không trừ phép năm" },
  UNPAID: { label: "Nghỉ không lương", hint: "Không trừ phép năm, không tính lương những ngày nghỉ" },
  OTHER: { label: "Việc riêng có lương", hint: "Kết hôn, tang… theo Điều 115 BLLĐ 2019" },
};

export const LEAVE_STATUS = {
  PENDING: { label: "Chờ duyệt", variant: "warning" },
  APPROVED: { label: "Đã duyệt", variant: "success" },
  REJECTED: { label: "Từ chối", variant: "destructive" },
  CANCELLED: { label: "Đã huỷ", variant: "secondary" },
};

const parse = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s ?? ""));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

/** Số ngày làm việc (T2–T6) trong [start, end]; 0 nếu khoảng không hợp lệ. */
export function countWorkdays(start, end) {
  const from = parse(start);
  const to = parse(end);
  if (!from || !to || from > to) return 0;
  let n = 0;
  for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) n += 1;
  }
  return n;
}

/** "2026-12-07", "2026-12-08" → "07/12 – 08/12/2026"; cùng ngày → "07/12/2026". */
export function formatRange(start, end) {
  const [y1, m1, d1] = String(start).split("-");
  const [y2, m2, d2] = String(end).split("-");
  if (start === end) return `${d1}/${m1}/${y1}`;
  return y1 === y2 ? `${d1}/${m1} – ${d2}/${m2}/${y2}` : `${d1}/${m1}/${y1} – ${d2}/${m2}/${y2}`;
}
