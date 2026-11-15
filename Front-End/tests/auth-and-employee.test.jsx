import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { LoginPage } from "../src/features/login-page";
import { EmployeeDashboard } from "../src/features/employee-dashboard";

describe("Login & Employee Portal features", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders clean login form without sample account cards on the bottom", () => {
    render(<LoginPage onLogin={() => {}} />);
    expect(screen.getByRole("heading", { name: "Đăng nhập hệ thống" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Mã nhân viên/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mật khẩu/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Đăng nhập/i })).toBeInTheDocument();

    // Đảm bảo không còn phần thẻ gợi ý mẫu ở dưới theo ảnh
    expect(screen.queryByText(/Tài khoản mẫu đăng nhập/i)).not.toBeInTheDocument();
  });

  it("renders employee portal with sidebar dashboard containing related sections", async () => {
    const mockUser = {
      id: 2,
      employee_code: "NV002",
      full_name: "Trần Thị Bình",
      email: "binh.tran@company.vn",
      role: "EMPLOYEE",
      department: "Thiết kế & Trải nghiệm",
      position: "Senior UI/UX Designer",
    };

    const user = userEvent.setup();
    const handleLogout = vi.fn();

    render(<EmployeeDashboard user={mockUser} onLogout={handleLogout} />);

    // Kiểm tra tên nhân viên & chức vụ
    expect(screen.getByText(/Xin chào, Trần Thị Bình!/i)).toBeInTheDocument();

    // Kiểm tra các mục ở sidebar dashboard bên cạnh
    expect(screen.getByText(/MỤC LIÊN QUAN/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tổng quan cá nhân/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lương & Phiếu lương/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lịch làm việc tuần/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Chấm công & Giờ làm/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hợp đồng & Phúc lợi/i })).toBeInTheDocument();

    // Kiểm tra thông số lương và lịch tuần
    expect(screen.getByText(/Lương thực nhận \(Net\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Ngày công tháng này/i)).toBeInTheDocument();

    // Chuyển sang mục Lương & Phiếu lương
    await user.click(screen.getByRole("button", { name: /Lương & Phiếu lương/i }));
    expect(screen.getByText(/Lịch sử chi trả các kỳ lương/i)).toBeInTheDocument();

    // Chuyển sang mục Hồ sơ cá nhân
    await user.click(screen.getByRole("button", { name: /Hồ sơ cá nhân/i }));
    expect(screen.getByText(/079196028491/i)).toBeInTheDocument();
    expect(screen.getByText(/Nguyễn Minh Tuấn/i)).toBeInTheDocument();
    expect(screen.getByText(/Đại học Kiến Trúc TP. Hồ Chí Minh/i)).toBeInTheDocument();

    // Chuyển sang mục Đội ngũ (Team's)
    await user.click(screen.getByRole("button", { name: /Đội ngũ \(Team's\)/i }));
    expect(screen.getAllByText(/Hoàng Mai Chi/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Head of Product Design/i)).toBeInTheDocument();
    expect(screen.getByText(/Bùi Phương Anh/i)).toBeInTheDocument();

    // Chuyển sang mục Chấm công & Giờ làm
    await user.click(screen.getByRole("button", { name: /Chấm công & Giờ làm/i }));
    expect(screen.getByText("Nhật ký chấm công")).toBeInTheDocument();
    expect(screen.queryByText(/Face ID|khuôn mặt/i)).not.toBeInTheDocument();

    // Kiểm tra nút Đăng xuất ở sidebar
    const logoutBtn = screen.getAllByRole("button", { name: /Đăng xuất/i })[0];
    await user.click(logoutBtn);
    expect(handleLogout).toHaveBeenCalled();
  });
});

