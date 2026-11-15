import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LoginPage } from "../src/features/login-page";
import { EmployeeDashboard } from "../src/features/employee-dashboard";
import { authApi } from "../src/lib/auth-api";
import { employeeDashboardPayload } from "./fixtures";

describe("Login & Employee Portal features", () => {
  it("renders clean login form without sample account cards on the bottom", () => {
    render(<LoginPage onLogin={() => {}} />);
    expect(screen.getByRole("heading", { name: "Đăng nhập hệ thống" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Mã nhân viên/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mật khẩu/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Đăng nhập/i })).toBeInTheDocument();
    expect(screen.queryByText(/Tài khoản mẫu đăng nhập/i)).not.toBeInTheDocument();
  });

  it("renders the employee portal from the dashboard API", async () => {
    vi.spyOn(authApi, "employeeDashboard").mockResolvedValue(employeeDashboardPayload);
    const user = userEvent.setup();
    const handleLogout = vi.fn();

    render(<EmployeeDashboard user={{ id: 2, role: "EMPLOYEE" }} onLogout={handleLogout} />);

    expect(await screen.findByText(/Xin chào, Trần Thị Bình!/i)).toBeInTheDocument();
    expect(screen.getByText(/MỤC LIÊN QUAN/i)).toBeInTheDocument();
    expect(screen.getByText(/Lương thực nhận \(Net\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/20\.407\.727/).length).toBeGreaterThan(0);
    expect(screen.getByText(/1 đang làm việc · 1 khác/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Lương & Phiếu lương/i }));
    expect(screen.getByText(/Lịch sử chi trả các kỳ lương/i)).toBeInTheDocument();
    expect(screen.getByRole("table")).toHaveTextContent("2026-10");
    expect(screen.getByRole("table")).toHaveTextContent("Đã chi trả");

    await user.click(screen.getByRole("button", { name: /Hồ sơ cá nhân/i }));
    expect(screen.getAllByText("Senior UI/UX Designer").length).toBeGreaterThan(0);
    expect(screen.getAllByText("02/01/2026").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /Đội ngũ \(Team's\)/i }));
    expect(screen.getByText("Bùi Phương Anh")).toBeInTheDocument();
    expect(screen.getByText("Bạn")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Chấm công & Giờ làm/i }));
    expect(screen.getByText("Tổng hợp công theo kỳ lương")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Đăng xuất/i })[0]);
    expect(handleLogout).toHaveBeenCalled();
  });

  it("shows the backend error with a retry button", async () => {
    const spy = vi
      .spyOn(authApi, "employeeDashboard")
      .mockRejectedValueOnce(new Error("Không thể kết nối máy chủ."))
      .mockResolvedValueOnce(employeeDashboardPayload);
    const user = userEvent.setup();
    render(<EmployeeDashboard user={{ id: 2 }} onLogout={vi.fn()} />);

    expect(await screen.findByText("Không thể kết nối máy chủ.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText(/Xin chào, Trần Thị Bình!/i)).toBeInTheDocument();
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
