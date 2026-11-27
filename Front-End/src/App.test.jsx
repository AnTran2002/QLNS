import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes, createQueryClient } from "@/App";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { ApiError, api } from "@/lib/api";
import { formatMoney, formatMoneyShort, formatPeriod, initials } from "@/lib/format";
import META from "./test-fixtures/meta.json";
import PAYROLL_ESTIMATE from "./test-fixtures/payroll-estimate.json";

vi.mock("@/lib/api", async (importOriginal) => {
  const mod = await importOriginal();
  const fns = Object.fromEntries(Object.keys(mod.api).map((k) => [k, vi.fn()]));
  return { ...mod, api: fns };
});

const ADMIN = { id: 1, employee_code: "NV001", full_name: "Nguyễn Văn An", email: "an@x.vn", role: "ADMIN", department: "Nhân sự", position: "Giám đốc nhân sự", status: "Đang làm việc", joined_at: "2026-01-01" };
const EMPLOYEE = { id: 2, employee_code: "NV002", full_name: "Trần Thị Bình", email: "binh@x.vn", role: "EMPLOYEE", department: "Thiết kế", position: "Designer", status: "Đang làm việc", joined_at: "2026-01-02", tutorial_completed_at: "2026-01-02 09:00:00" };

const DASHBOARD = {
  user_info: EMPLOYEE,
  contract: { id: 2, base_salary: 18500000, insurance_salary: 15000000, allowance: 2500000, dependents_count: 1, created_at: "2026-01-02" },
  payroll_history: [{ id: 2, period_id: 1, month_year: "2026-10", standard_days: 22, period_status: "PAID", actual_days: 22, ot_hours: 8, gross_salary: 22261363.64, social_insurance: 1575000, tax_deduction: 21700000, personal_tax: 0, net_salary: 20686363.64 }],
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
  api.meta.mockResolvedValue(META);
  api.payrollEstimate.mockResolvedValue(PAYROLL_ESTIMATE);
  api.contractDocuments.mockResolvedValue([]);
  api.completeTutorial.mockResolvedValue(null);
  api.resetTutorial.mockResolvedValue(null);
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
    expect(await screen.findByRole("heading", { name: /Tổng quan quản trị/ })).toBeInTheDocument();
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

describe("Chấm công & OT", () => {
  it("mở form điều chỉnh OT, yêu cầu lý do và lưu đúng dữ liệu", async () => {
    api.me.mockResolvedValue({ user: ADMIN });
    const period = { id: 2, month_year: "2026-11", standard_days: 22, status: "DRAFT" };
    api.payrollAttendance.mockResolvedValue({ period, items: [{ ...ATT_ROW, actual_days: 13 }] });
    api.saveAttendance.mockResolvedValue({
      period, updated_count: 1,
      items: [{ ...ATT_ROW, payroll_item_id: 9, actual_days: 13, ot_hours: 4, gross_salary: 20000000, net_salary: 18000000 }],
    });
    renderApp("/admin/cham-cong?ky=2");
    const user = userEvent.setup();
    expect(await screen.findByRole("heading", { name: "Chấm công & OT" })).toBeInTheDocument();
    const days = await screen.findByLabelText("Ngày công của Trần Thị Bình");
    expect(days.tagName).not.toBe("INPUT");
    expect(days).toHaveTextContent("13");
    await user.click(screen.getByRole("button", { name: "Điều chỉnh OT của Trần Thị Bình" }));
    expect(await screen.findByText(/NV002 · Tháng 11\/2026/)).toBeInTheDocument();
    expect(screen.getByText("Nội dung cần thay đổi · Giờ OT")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Xác nhận thay đổi" }));
    expect(api.saveAttendance).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Lý do cần cụ thể");
    const ot = screen.getByLabelText("Giờ OT điều chỉnh");
    await user.clear(ot);
    await user.type(ot, "4");
    await user.type(screen.getByLabelText("Lý do thay đổi"), "Điều chỉnh OT theo xác nhận quản lý");
    await user.click(screen.getByRole("button", { name: "Xác nhận thay đổi" }));
    await waitFor(() => expect(api.saveAttendance).toHaveBeenCalledWith(2, [{
      user_id: 2,
      ot_hours: 4,
      reason: "Điều chỉnh OT theo xác nhận quản lý",
    }]));
    expect(await screen.findByText("18.000.000 ₫")).toBeInTheDocument();
  });

  it("không cung cấp ô sửa ngày công cho admin", async () => {
    api.me.mockResolvedValue({ user: ADMIN });
    api.payrollAttendance.mockResolvedValue({
      period: { id: 2, month_year: "2026-11", standard_days: 22, status: "DRAFT" },
      items: [{ ...ATT_ROW, actual_days: 13 }],
    });
    renderApp("/admin/cham-cong");
    const days = await screen.findByLabelText("Ngày công của Trần Thị Bình");
    expect(days.tagName).not.toBe("INPUT");
    expect(days).toHaveTextContent("13");
    expect(api.saveAttendance).not.toHaveBeenCalled();
  });

  it("admin có thể xem lý do và giá trị trước/sau trong lịch sử lương", async () => {
    api.me.mockResolvedValue({ user: ADMIN });
    const period = { id: 2, month_year: "2026-11", standard_days: 22, status: "DRAFT" };
    api.payrollAttendance.mockResolvedValue({
      period,
      items: [{ ...ATT_ROW, payroll_item_id: 9, actual_days: 13, ot_hours: 4, gross_salary: 20000000 }],
    });
    api.payrollChanges.mockResolvedValue([{
      id: 1,
      change_type: "INPUT_UPDATE",
      changed_by_name: ADMIN.full_name,
      created_at: "2026-11-20 09:00:00",
      reason: "Điều chỉnh OT theo xác nhận quản lý",
      previous_actual_days: 12,
      actual_days: 13,
      previous_ot_hours: 2,
      ot_hours: 4,
      previous_gross_salary: 19000000,
      gross_salary: 20000000,
      previous_social_insurance: 1575000,
      social_insurance: 1575000,
      previous_tax_deduction: 21700000,
      tax_deduction: 21700000,
      previous_personal_tax: 0,
      personal_tax: 0,
      previous_net_salary: 17425000,
      net_salary: 18425000,
    }]);
    renderApp("/admin/cham-cong?ky=2");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Xem lịch sử lương của Trần Thị Bình" }));
    expect(await screen.findByText("Điều chỉnh OT theo xác nhận quản lý")).toBeInTheDocument();
    expect(screen.getByText("12 → 13")).toBeInTheDocument();
    expect(api.payrollChanges).toHaveBeenCalledWith(2, 2);
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
  it("hiển thị căn cứ pháp lý và hướng dẫn phép năm trong form", async () => {
    api.me.mockResolvedValue({ user: EMPLOYEE });
    renderApp("/nhan-vien/nghi-phep");

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Tạo đơn nghỉ" }));
    expect(await screen.findByText(/Điều 113–114 Bộ luật Lao động 2019/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("VD: Đăng ký nghỉ phép năm theo kế hoạch")).toBeInTheDocument();
  });

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

  it("chặn tạo đơn nghỉ bắt đầu từ ngày quá khứ", async () => {
    api.me.mockResolvedValue({ user: EMPLOYEE });
    renderApp("/nhan-vien/nghi-phep");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Tạo đơn nghỉ" }));

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
    fireEvent.change(screen.getByLabelText("Từ ngày"), { target: { value: yesterdayKey } });
    fireEvent.change(screen.getByLabelText("Đến ngày"), { target: { value: yesterdayKey } });
    await user.click(screen.getByRole("button", { name: "Gửi đơn" }));

    expect(await screen.findByText("Ngày bắt đầu không được ở quá khứ")).toBeInTheDocument();
    expect(api.createLeave).not.toHaveBeenCalled();
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

describe("Điều chỉnh lương", () => {
  it("yêu cầu phụ cấp cố định khi tạo hợp đồng và chấp nhận giá trị 0", async () => {
    api.me.mockResolvedValue({ user: ADMIN });
    api.createEmployee.mockResolvedValue({ id: 3 });
    renderApp("/admin/nhan-vien?moi=1");

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Họ và tên"), "Nguyễn Thị Mai");
    await user.type(screen.getByLabelText("Email"), "mai@x.vn");
    await user.type(screen.getByLabelText("Phòng ban"), "Kế toán");
    await user.type(screen.getByLabelText("Chức danh"), "Kế toán viên");

    const allowance = screen.getByLabelText("Phụ cấp lương cố định (₫/tháng)");
    expect(allowance).toBeRequired();
    await user.click(screen.getByRole("button", { name: "Thêm nhân viên" }));
    expect(await screen.findByText("Phụ cấp lương cố định bắt buộc nhập (nhập 0 nếu không có)")).toBeInTheDocument();
    expect(api.createEmployee).not.toHaveBeenCalled();

    await user.type(allowance, "0");
    await user.click(screen.getByRole("button", { name: "Thêm nhân viên" }));
    await waitFor(() => expect(api.createEmployee).toHaveBeenCalledWith(
      expect.objectContaining({ allowance: "0" }),
    ));
  });

  it("bắt buộc lý do và gửi điều chỉnh qua luồng riêng", async () => {
    const nextMonthDate = new Date();
    nextMonthDate.setDate(1);
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const effectiveMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}`;
    api.me.mockResolvedValue({ user: ADMIN });
    api.contracts.mockResolvedValue([{
      id: 1,
      full_name: ADMIN.full_name,
      employee_code: ADMIN.employee_code,
      department: ADMIN.department,
      base_salary: 25000000,
      insurance_salary: 20000000,
      allowance: 3000000,
      dependents_count: 1,
      created_at: "2026-01-01",
    }]);
    api.salaryAdjustments.mockResolvedValue([]);
    api.createSalaryAdjustment.mockResolvedValue({ id: 1, effective_month: effectiveMonth });
    renderApp("/admin/hop-dong");

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: `Điều chỉnh lương của ${ADMIN.full_name}` }));
    await user.clear(screen.getByLabelText("Lương cơ bản (₫)"));
    await user.type(screen.getByLabelText("Lương cơ bản (₫)"), "26000000");
    await user.click(screen.getByRole("button", { name: "Ghi nhận điều chỉnh" }));

    expect(await screen.findByText("Lý do cần cụ thể, từ 10 đến 500 ký tự")).toBeInTheDocument();
    expect(api.createSalaryAdjustment).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Lý do điều chỉnh"), "Điều chỉnh theo quyết định");
    await user.click(screen.getByRole("button", { name: "Ghi nhận điều chỉnh" }));
    await waitFor(() => expect(api.createSalaryAdjustment).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ base_salary: "26000000", reason: "Điều chỉnh theo quyết định" }),
    ));
  });
});
