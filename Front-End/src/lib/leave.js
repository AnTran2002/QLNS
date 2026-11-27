/* Nghỉ phép — khớp Back-End/services/LeavePolicy.php (Back-End là nơi kiểm tra cuối cùng). */

export const LEAVE_TYPES = {
  ANNUAL: {
    label: "Nghỉ hằng năm (phép năm)",
    hint: "Theo Điều 113–114 Bộ luật Lao động 2019; dùng quỹ phép năm của nhân viên.",
    reasonPlaceholder: "VD: Đăng ký nghỉ phép năm theo kế hoạch",
  },
  SICK: {
    label: "Nghỉ ốm đau (BHXH)",
    hint: "Chế độ ốm đau theo Luật BHXH 2024; cần đủ điều kiện và hồ sơ y tế. Đơn này chỉ ghi nhận ngày nghỉ, không tự xác nhận quyền lợi BHXH.",
    reasonPlaceholder: "Nêu thời gian điều trị; hồ sơ chế độ BHXH bổ sung với nhân sự",
  },
  UNPAID: {
    label: "Nghỉ không hưởng lương",
    hint: "Khoản 2 Điều 115 Bộ luật Lao động 2019: 1 ngày khi ông/bà, anh/chị/em ruột qua đời hoặc cha/mẹ đẻ/nuôi, anh/chị/em ruột kết hôn; trường hợp khác cần thỏa thuận.",
    reasonPlaceholder: "Nêu lý do và thỏa thuận nghỉ không hưởng lương",
  },
  OTHER: {
    label: "Nghỉ việc riêng hưởng lương",
    hint: "Khoản 1 Điều 115 Bộ luật Lao động 2019: bản thân kết hôn (3 ngày), con kết hôn (1 ngày), cha/mẹ đẻ hoặc nuôi, vợ/chồng, con đẻ hoặc nuôi qua đời (3 ngày). Ghi rõ sự kiện để quản trị đối chiếu trước khi duyệt.",
    reasonPlaceholder: "Nêu rõ sự kiện theo Điều 115: kết hôn, con kết hôn hoặc thân nhân qua đời",
    events: {
      SELF_MARRIAGE: "Người lao động kết hôn (tối đa 3 ngày)",
      CHILD_MARRIAGE: "Con kết hôn (tối đa 1 ngày)",
      FAMILY_DEATH: "Cha/mẹ đẻ hoặc nuôi, vợ/chồng hoặc con đẻ hoặc nuôi qua đời (tối đa 3 ngày)",
    },
  },
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
