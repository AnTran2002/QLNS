import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes, createQueryClient } from "@/App";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { ApiError, api } from "@/lib/api";
import { formatMoney, formatMoneyShort, formatPeriod, initials } from "@/lib/format";

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
  api.payrollAttendance.mockResolvedValue({ period: { id: 2, month_year: "2026-11", standard_days: 22, status: "DRAFT" }, items: [] });
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

describe("UC-02 · Nhập liệu bảng công & OT", () => {
  it("sửa công trên Grid → lưu gửi đúng entries", async () => {
    api.me.mockResolvedValue({ user: ADMIN });
    const period = { id: 2, month_year: "2026-11", standard_days: 22, status: "DRAFT" };
    api.payrollAttendance.mockResolvedValue({ period, items: [ATT_ROW] });
    api.saveAttendance.mockResolvedValue({
      period, updated_count: 1,
      items: [{ ...ATT_ROW, payroll_item_id: 9, actual_days: 21, ot_hours: 4, gross_salary: 20000000, net_salary: 18000000 }],
    });
    renderApp("/admin/cham-cong?ky=2");
    const user = userEvent.setup();
    expect(await screen.findByRole("heading", { name: "Chấm công & OT" })).toBeInTheDocument();
    const days = await screen.findByLabelText("Ngày công của Trần Thị Bình");
    await user.type(days, "21");
    await user.type(screen.getByLabelText("Giờ OT của Trần Thị Bình"), "4");
    expect(screen.getByText(/thay đổi chưa lưu/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Lưu thay đổi/ }));
    await waitFor(() => expect(api.saveAttendance).toHaveBeenCalledWith(2, [{ user_id: 2, actual_days: 21, ot_hours: 4 }]));
    expect(await screen.findByText("18.000.000 ₫")).toBeInTheDocument();
  });

  it("chặn ngày công vượt số ngày trong tháng", async () => {
    api.me.mockResolvedValue({ user: ADMIN });
    api.payrollAttendance.mockResolvedValue({ period: { id: 2, month_year: "2026-11", standard_days: 22, status: "DRAFT" }, items: [ATT_ROW] });
    renderApp("/admin/cham-cong");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Ngày công của Trần Thị Bình"), "45");
    await user.click(screen.getByRole("button", { name: /Lưu thay đổi/ }));
    expect(api.saveAttendance).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Ngày công của Trần Thị Bình")).toHaveAttribute("aria-invalid", "true");
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
