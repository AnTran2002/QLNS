import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes, createQueryClient } from "@/App";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { ApiError, api } from "@/lib/api";
import { PAYROLL_RULES, progressiveTax, taxableIncomeFromTax } from "@/lib/constants";
import { formatMoney, formatMoneyShort, formatMonthShort, formatPeriod, initials } from "@/lib/format";
import { allowedPeriodMonths, weekdaysInMonth } from "@/pages/admin/attendance-dialogs";

vi.mock("@/lib/api", async (importOriginal) => {
  const mod = await importOriginal();
  const fns = Object.fromEntries(Object.keys(mod.api).map((k) => [k, vi.fn()]));
  return { ...mod, api: fns };
});

const ADMIN = { id: 1, employee_code: "NV001", full_name: "Nguyễn Văn An", email: "an@x.vn", role: "ADMIN", department: "Nhân sự", position: "Giám đốc nhân sự", status: "Đang làm việc", joined_at: "2026-01-01" };
const EMPLOYEE = { id: 2, employee_code: "NV002", full_name: "Trần Thị Bình", email: "binh@x.vn", role: "EMPLOYEE", department: "Thiết kế", position: "Designer", status: "Đang làm việc", joined_at: "2026-01-02" };

const DASHBOARD = {
  user_info: EMPLOYEE,
  contract: { id: 2, base_salary: 18500000, insurance_salary: 15000000, allowance: 2500000, dependents_count: 1, created_at: "2026-01-02" },
  payroll_history: [{ id: 2, period_id: 1, month_year: "2026-10", standard_days: 22, period_status: "PAID", actual_days: 22, ot_hours: 8, gross_salary: 22261363.64, social_insurance: 1575000, tax_deduction: 15400000, personal_tax: 278636.36, net_salary: 20407727.27 }],
  attendance_summary: { total_actual_days: 22, total_ot_hours: 8 },
  current_period: { id: 2, month_year: "2026-11", standard_days: 22, status: "DRAFT" },
  work_schedule: { monday: "08:30 - 17:30", tuesday: "08:30 - 17:30", wednesday: "08:30 - 17:30", thursday: "08:30 - 17:30", friday: "08:30 - 17:30", saturday: "Nghỉ tuần", sunday: "Nghỉ tuần" },
  team_members: [EMPLOYEE],
};

const LEAVE_BALANCE = { year: 2026, quota: 12, used: 3, pending: 2, remaining: 7 };
const LEAVE_REQ = {
  id: 7, user_id: 2, employee_code: "NV002", full_name: "Trần Thị Bình", department: "Thiết kế", avatar: null,
  type: "ANNUAL", start_date: "2026-12-07", end_date: "2026-12-08", days: 2, reason: "Về quê giải quyết việc gia đình",
  status: "PENDING", reviewer_name: null, review_note: null, created_at: "2026-11-20 09:00:00",
};

function renderApp(path) {
  return render(
    <ThemeProvider>
      <QueryClientProvider client={createQueryClient()}>
        <AuthProvider>
          <MemoryRouter initialEntries={[path]}>
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.employees.mockResolvedValue([{ ...ADMIN, contract_id: 1, base_salary: 25000000, allowance: 3000000, insurance_salary: 20000000, dependents_count: 1 }]);
  api.payrollPeriods.mockResolvedValue([{ id: 2, month_year: "2026-11", standard_days: 22, status: "DRAFT", items_count: 0, total_gross: 0, total_net: 0 }]);
  api.employeeDashboard.mockResolvedValue(DASHBOARD);
  api.employeeAttendance.mockResolvedValue({
    available: true,
    month: "2026-11",
    months: ["2026-11", "2026-10"],
    records: [
      { id: 1, work_date: "2026-11-02", shift: "Ca hành chính", shift_start: "08:30", shift_end: "17:30", check_in: "08:25", check_out: "17:40", status: "PRESENT", work_hours: 8, ot_hours: 0, note: null },
      { id: 2, work_date: "2026-11-03", shift: "Ca hành chính", shift_start: "08:30", shift_end: "17:30", check_in: "08:45", check_out: "19:00", status: "LATE", work_hours: 7.75, ot_hours: 1.5, note: null },
      { id: 3, work_date: "2026-11-04", shift: "Ca hành chính", shift_start: "08:30", shift_end: "17:30", check_in: null, check_out: null, status: "LEAVE", work_hours: 0, ot_hours: 0, note: "Nghỉ phép năm" },
    ],
  });
  api.payrollAttendance.mockResolvedValue({ period: { id: 2, month_year: "2026-11", standard_days: 22, status: "DRAFT" }, items: [] });
  api.myLeave.mockResolvedValue({ available: true, balance: LEAVE_BALANCE, requests: [LEAVE_REQ] });
  api.leaveRequests.mockResolvedValue({ available: true, requests: [LEAVE_REQ, { ...LEAVE_REQ, id: 8, status: "APPROVED", reason: "Khám sức khoẻ", type: "SICK" }] });
});

describe("Phân quyền & đăng nhập", () => {
  it("chưa đăng nhập → chuyển về trang đăng nhập", async () => {
    api.me.mockRejectedValue(new ApiError("Chưa đăng nhập", 401));
    renderApp("/admin");
    expect(await screen.findByRole("heading", { name: "Đăng nhập" })).toBeInTheDocument();
  });

  it("hiện lỗi từ Back-End khi sai mật khẩu", async () => {
    api.me.mockRejectedValue(new ApiError("Chưa đăng nhập", 401));
    api.login.mockRejectedValue(new ApiError("Mã nhân viên hoặc mật khẩu không chính xác", 401));
    renderApp("/login");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Mã nhân viên hoặc email"), "NV002");
    await user.type(screen.getByLabelText("Mật khẩu"), "sai");
    await user.click(screen.getByRole("button", { name: /Đăng nhập/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Mã nhân viên hoặc mật khẩu không chính xác");
  });

  it("đăng nhập ADMIN → vào trang quản trị", async () => {
    api.me.mockRejectedValueOnce(new ApiError("Chưa đăng nhập", 401)).mockResolvedValue({ user: ADMIN });
    api.login.mockResolvedValue({ user: ADMIN, token: "t" });
    renderApp("/login");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Mã nhân viên hoặc email"), "NV001");
    await user.type(screen.getByLabelText("Mật khẩu"), "123456");
    await user.click(screen.getByRole("button", { name: /Đăng nhập/ }));
    expect(await screen.findByText(/Tổng quan quản trị/)).toBeInTheDocument();
    expect(api.login).toHaveBeenCalledWith("NV001", "123456");
  });

  it("EMPLOYEE không vào được /admin, bị chuyển về cổng nhân viên", async () => {
    api.me.mockResolvedValue({ user: EMPLOYEE });
    renderApp("/admin/nhan-vien");
    expect((await screen.findAllByText("Cổng nhân viên")).length).toBeGreaterThan(0);
    expect(await screen.findByText(/Đã làm được/)).toBeInTheDocument();
    expect(api.employees).not.toHaveBeenCalled();
  });
});

const ATT_ROW = {
  user_id: 2, employee_code: "NV002", full_name: "Trần Thị Bình", department: "Thiết kế", employee_status: "Đang làm việc",
  base_salary: 18500000, insurance_salary: 15000000, allowance: 2500000, dependents_count: 1,
  payroll_item_id: null, actual_days: 0, ot_hours: 0, gross_salary: 0, social_insurance: 0, tax_deduction: 0, personal_tax: 0, net_salary: 0,
};

describe("Chấm công & OT (tự động, chỉ xem)", () => {
  const period = { id: 2, month_year: "2026-11", standard_days: 21, status: "DRAFT" };
  const synced = {
    ...ATT_ROW, payroll_item_id: 9, actual_days: 19, ot_hours: 4, gross_salary: 20000000, net_salary: 18000000,
    breakdown: { present: 17, late: 1, remote: 1, paid_leave: 0, unpaid_leave: 0, absent: 0, recorded_days: 19 },
  };

  it("hiện số liệu tổng hợp từ chấm công, không có ô nhập / import / lưu", async () => {
    api.me.mockResolvedValue({ user: ADMIN });
    api.payrollAttendance.mockResolvedValue({ period, items: [synced], syncedUntil: "2026-11-20", missingContracts: [] });
    renderApp("/admin/cham-cong?ky=2");
    expect(await screen.findByRole("heading", { name: "Chấm công & OT" })).toBeInTheDocument();
    expect(await screen.findByText("18.000.000 ₫")).toBeInTheDocument();
    expect(screen.getByText(/Có mặt 17 · Muộn 1 · Remote 1/)).toBeInTheDocument();
    expect(screen.getByText(/dữ liệu đến/)).toBeInTheDocument();
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /Import|Lưu thay đổi/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Đồng bộ lại/ })).toBeInTheDocument();
  });

  it("tạo kỳ chỉ cho tháng hiện tại / kế tiếp, công chuẩn = số ngày T2–T6", () => {
    const opts = allowedPeriodMonths(new Date(2026, 10, 21));
    expect(opts.map((o) => o.monthYear)).toEqual(["2026-11", "2026-12"]);
    expect(allowedPeriodMonths(new Date(2026, 11, 5)).map((o) => o.monthYear)).toEqual(["2026-12", "2027-01"]);
    expect(weekdaysInMonth("2026-11")).toBe(21);
    expect(weekdaysInMonth("2026-02")).toBe(20);
  });
});

describe("Hợp đồng cố định & điều chỉnh lương", () => {
  it("trang hợp đồng chỉ xem, có lịch sử phụ lục kèm lý do", async () => {
    api.me.mockResolvedValue({ user: ADMIN });
    const c = { id: 6, user_id: 1, employee_code: "NV001", full_name: "Nguyễn Văn An", department: "Nhân sự", base_salary: 27000000, insurance_salary: 20000000, allowance: 3000000, dependents_count: 1, created_at: "2026-11-01", version_count: 2 };
    api.contracts.mockResolvedValue([c]);
    api.contract.mockResolvedValue({
      ...c,
      history: [
        { id: 6, base_salary: 27000000, insurance_salary: 20000000, allowance: 3000000, dependents_count: 1, change_reason: "Tăng lương định kỳ 2026", created_at: "2026-11-01" },
        { id: 1, base_salary: 25000000, insurance_salary: 20000000, allowance: 3000000, dependents_count: 1, change_reason: "Ký hợp đồng lao động", created_at: "2026-01-01" },
      ],
    });
    renderApp("/admin/hop-dong");
    const user = userEvent.setup();
    expect(screen.queryByRole("button", { name: /Sửa hợp đồng/ })).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Xem hợp đồng của Nguyễn Văn An" }));
    expect(await screen.findByText("Tăng lương định kỳ 2026")).toBeInTheDocument();
    expect(screen.getByText("Phụ lục 1")).toBeInTheDocument();
    expect(screen.getByText("Hợp đồng gốc")).toBeInTheDocument();
    expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
  });

  it("sửa nhân viên: lương bị khoá; điều chỉnh bắt buộc lý do", async () => {
    api.me.mockResolvedValue({ user: ADMIN });
    api.updateEmployee.mockResolvedValue({});
    renderApp("/admin/nhan-vien");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Thao tác với Nguyễn Văn An" }));
    await user.click(await screen.findByRole("menuitem", { name: /Sửa/ }));
    const base = await screen.findByLabelText("Lương cơ bản (₫)");
    expect(base).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Điều chỉnh lương/ }));
    expect(base).toBeEnabled();
    await user.clear(base);
    await user.type(base, "27000000");
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    expect(await screen.findByText(/Lý do điều chỉnh lương phải từ 5–500 ký tự/)).toBeInTheDocument();
    expect(api.updateEmployee).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Lý do điều chỉnh"), "Tăng lương định kỳ 2026");
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() =>
      expect(api.updateEmployee).toHaveBeenCalledWith(1, expect.objectContaining({ base_salary: "27000000", salary_change_reason: "Tăng lương định kỳ 2026" })),
    );
  });
});

describe("Thuế TNCN 2026", () => {
  it("biểu lũy tiến 5 bậc và suy ngược thu nhập tính thuế", () => {
    expect(PAYROLL_RULES.personalDeduction).toBe(15_500_000);
    expect(PAYROLL_RULES.dependentDeduction).toBe(6_200_000);
    expect(progressiveTax(0)).toBe(0);
    expect(progressiveTax(10_000_000)).toBe(500_000);
    expect(progressiveTax(30_000_000)).toBe(2_500_000);
    expect(progressiveTax(120_000_000)).toBe(27_500_000);
    for (const t of [3_000_000, 25_000_000, 75_000_000]) expect(taxableIncomeFromTax(progressiveTax(t))).toBe(t);
  });
});

describe("Giao diện", () => {
  it("nút chuyển sáng/tối đổi class .dark trên <html>", async () => {
    api.me.mockRejectedValue(new ApiError("Chưa đăng nhập", 401));
    renderApp("/login");
    const user = userEvent.setup();
    const toggle = await screen.findByRole("button", { name: /Chuyển sang giao diện tối/ });
    await user.click(toggle);
    await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
    await user.click(await screen.findByRole("button", { name: /Chuyển sang giao diện sáng/ }));
    await waitFor(() => expect(document.documentElement).not.toHaveClass("dark"));
  });
});

describe("Định dạng", () => {
  it("tiền, kỳ lương, chữ viết tắt", () => {
    expect(formatMoney(25000000)).toBe("25.000.000 ₫");
    expect(formatMoneyShort(18500000)).toBe("18,5 tr");
    expect(formatMoneyShort(278636)).toBe("278.636 ₫");
    expect(formatPeriod("2026-10")).toBe("Tháng 10/2026");
    expect(formatMonthShort("2026-03")).toBe("T3");
    expect(initials("Nguyễn Văn An")).toBe("NA");
  });
});

describe("Cổng nhân viên", () => {
  it.each([
    ["/nhan-vien/phieu-luong", "Phiếu lương", "Các kỳ lương"],
    ["/nhan-vien/cham-cong", "Chấm công", "Chi tiết theo kỳ"],
    ["/nhan-vien/cham-cong", "Chấm công", "Lịch đi làm"],
    ["/nhan-vien/ho-so", "Hồ sơ", "Hợp đồng lao động"],
    ["/nhan-vien/dong-nghiep", "Phòng Thiết kế", "(bạn)"],
  ])("%s hiển thị đúng nội dung", async (path, heading, text) => {
    api.me.mockResolvedValue({ user: EMPLOYEE });
    renderApp(path);
    expect(await screen.findByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
    expect((await screen.findAllByText(text)).length).toBeGreaterThan(0);
  });

  it("phiếu lương đã chốt có link tải về", async () => {
    api.me.mockResolvedValue({ user: EMPLOYEE });
    renderApp("/nhan-vien/phieu-luong");
    const link = await screen.findByRole("link", { name: /Tải phiếu lương Tháng 10/ });
    expect(link.getAttribute("href")).toContain("action=payroll/payslip/download&period_id=1");
  });
});

describe("Nghỉ phép", () => {
  it("nhân viên thấy quỹ phép và đơn của mình", async () => {
    api.me.mockResolvedValue({ user: EMPLOYEE });
    renderApp("/nhan-vien/nghi-phep");
    expect(await screen.findByRole("heading", { level: 1, name: "Nghỉ phép" })).toBeInTheDocument();
    expect((await screen.findAllByText("Về quê giải quyết việc gia đình")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Chờ duyệt").length).toBeGreaterThan(0);
  });

  it("nhân viên huỷ đơn đang chờ duyệt", async () => {
    api.me.mockResolvedValue({ user: EMPLOYEE });
    api.cancelLeave.mockResolvedValue({ ...LEAVE_REQ, status: "CANCELLED" });
    renderApp("/nhan-vien/nghi-phep");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /Huỷ đơn/ }));
    const buttons = await screen.findAllByRole("button", { name: /Huỷ đơn/ });
    await user.click(buttons[buttons.length - 1]);
    await waitFor(() => expect(api.cancelLeave).toHaveBeenCalledWith(7));
  });

  it("chưa chạy migration 005 → hiện hướng dẫn", async () => {
    api.me.mockResolvedValue({ user: EMPLOYEE });
    api.myLeave.mockResolvedValue({ available: false, balance: null, requests: [] });
    renderApp("/nhan-vien/nghi-phep");
    expect(await screen.findByText(/005_leave_requests\.sql/)).toBeInTheDocument();
  });

  it("admin duyệt đơn chờ", async () => {
    api.me.mockResolvedValue({ user: ADMIN });
    api.reviewLeave.mockResolvedValue({ ...LEAVE_REQ, status: "APPROVED" });
    renderApp("/admin/nghi-phep");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Duyệt đơn của Trần Thị Bình" }));
    await waitFor(() => expect(api.reviewLeave).toHaveBeenCalledWith(7, "APPROVED", undefined));
  });

  it("admin từ chối phải ghi lý do", async () => {
    api.me.mockResolvedValue({ user: ADMIN });
    api.reviewLeave.mockResolvedValue({ ...LEAVE_REQ, status: "REJECTED" });
    renderApp("/admin/nghi-phep");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Từ chối đơn của Trần Thị Bình" }));
    await user.click(await screen.findByRole("button", { name: /Từ chối đơn$/ }));
    expect(await screen.findByText(/Hãy ghi lý do từ chối/)).toBeInTheDocument();
    expect(api.reviewLeave).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText("Lý do từ chối"), "Trùng lịch bàn giao");
    await user.click(screen.getByRole("button", { name: /Từ chối đơn$/ }));
    await waitFor(() => expect(api.reviewLeave).toHaveBeenCalledWith(7, "REJECTED", "Trùng lịch bàn giao"));
  });
});
