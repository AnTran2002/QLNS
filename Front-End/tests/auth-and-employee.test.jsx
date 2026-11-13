import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { LoginPage } from "../src/features/login-page";
import { EmployeeDashboard } from "../src/features/employee-dashboard";
import { FaceAttendanceModal } from "../src/features/face-attendance-modal";

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
    expect(screen.getByText(/Nhật ký chấm công qua thiết bị Camera Face ID/i)).toBeInTheDocument();

    // Kiểm tra nút Đăng xuất ở sidebar
    const logoutBtn = screen.getAllByRole("button", { name: /Đăng xuất/i })[0];
    await user.click(logoutBtn);
    expect(handleLogout).toHaveBeenCalled();
  });

  it("renders admin face attendance modal with AI camera and manual fallback", async () => {
    const mockEmployees = [
      { id: 1, employee_code: "NV001", full_name: "Nguyễn Văn An", department: "Ban Điều Hành" },
      { id: 2, employee_code: "NV002", full_name: "Trần Thị Bình", department: "Thiết kế" },
    ];

    const user = userEvent.setup();
    render(<FaceAttendanceModal open={true} onOpenChange={() => {}} employees={mockEmployees} />);

    expect(screen.getByText(/Hệ Thống Chấm Công Khuôn Mặt AI/i)).toBeInTheDocument();
    expect(screen.getByText(/Camera AI Face ID/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Quét Face ID/i })).toBeInTheDocument();

    // Chuyển sang tab Chấm công thủ công (khi camera lỗi)
    const manualTab = screen.getByRole("button", { name: /Chấm công thủ công/i });
    await user.click(manualTab);
    expect(screen.getByText(/Chế độ dự phòng khi lỗi camera/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Check-in/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /Check-out/i }).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("button", { name: "Check-out", exact: true })[0]);
    await user.click(screen.getByRole("button", { name: "Lịch sử" }));
    expect(screen.getByText("Lịch sử Check-in / Check-out (3)")).toBeInTheDocument();
    expect(screen.getByText(/Thủ công \(Admin\)/)).toBeInTheDocument();
    expect(screen.getAllByText("Không có ảnh").length).toBeGreaterThan(0);
  });

  it("saves a webcam photo with the AI check-in history event", async () => {
    const employees = [
      { id: 2, employee_code: "NV002", full_name: "Trần Thị Bình", department: "Thiết kế" },
    ];
    const stream = { getTracks: () => [{ stop: vi.fn() }] };
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    const mediaDevicesDescriptor = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
    const videoProperties = ["srcObject", "videoWidth", "videoHeight"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, key),
    ]);

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    Object.defineProperty(HTMLVideoElement.prototype, "srcObject", {
      configurable: true,
      set() {},
    });
    Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", {
      configurable: true,
      get: () => 640,
    });
    Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", {
      configurable: true,
      get: () => 480,
    });
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({ drawImage: vi.fn() });
    const toDataURL = vi
      .spyOn(HTMLCanvasElement.prototype, "toDataURL")
      .mockReturnValue("data:image/jpeg;base64,attendance-photo");

    try {
      const user = userEvent.setup();
      render(<FaceAttendanceModal open={true} onOpenChange={() => {}} employees={employees} />);

      await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
      await user.click(screen.getByRole("button", { name: /Sáng \(Check-in\)/i }));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /Quét Face ID/i })).toBeEnabled(),
      );
      await user.click(screen.getByRole("button", { name: /Quét Face ID/i }));
      await waitFor(() => expect(screen.getByText("CHECK-IN")).toBeInTheDocument(), {
        timeout: 3000,
      });

      await user.click(screen.getByRole("button", { name: "Lịch sử" }));
      expect(
        await screen.findByAltText("Ảnh check-in của Trần Thị Bình"),
      ).toHaveAttribute("src", "data:image/jpeg;base64,attendance-photo");
      expect(getContext).toHaveBeenCalled();
      expect(toDataURL).toHaveBeenCalledWith("image/jpeg", 0.65);
    } finally {
      getContext.mockRestore();
      toDataURL.mockRestore();
      if (mediaDevicesDescriptor) {
        Object.defineProperty(navigator, "mediaDevices", mediaDevicesDescriptor);
      } else {
        delete navigator.mediaDevices;
      }
      videoProperties.forEach(([key, descriptor]) => {
        if (descriptor) {
          Object.defineProperty(HTMLVideoElement.prototype, key, descriptor);
        } else {
          delete HTMLVideoElement.prototype[key];
        }
      });
    }
  });
});

