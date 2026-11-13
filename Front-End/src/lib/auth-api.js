const API_BASE = "http://localhost:8888";

// Tài khoản giả lập dự phòng khi backend PHP chưa khởi động
export const DEMO_ACCOUNTS = {
  admin: {
    id: 1,
    employee_code: "NV001",
    full_name: "Nguyễn Văn An",
    email: "an.nguyen@company.vn",
    role: "ADMIN",
    department: "Ban Điều Hành",
    position: "Giám đốc nhân sự",
  },
  employee: {
    id: 2,
    employee_code: "NV002",
    full_name: "Trần Thị Bình",
    email: "binh.tran@company.vn",
    role: "EMPLOYEE",
    department: "Thiết kế & Trải nghiệm",
    position: "Senior UI/UX Designer",
  },
};

export const authApi = {
  login: async (identifier, password) => {
    try {
      const res = await fetch(`${API_BASE}/?action=login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          employee_code: identifier,
          email: identifier,
          password,
        }),
        credentials: "include",
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Backend PHP offline -> fallback sang kiểm tra tài khoản demo
    }

    // Chế độ demo / offline
    const cleanId = String(identifier || "").trim().toLowerCase();
    if (
      (cleanId === "nv001" || cleanId === "an.nguyen@company.vn" || cleanId === "admin@acme.vn" || cleanId === "admin") &&
      password === "123456"
    ) {
      return {
        success: true,
        data: { user: DEMO_ACCOUNTS.admin, token: "demo-admin-token" },
        message: "Đăng nhập Quản trị viên thành công",
      };
    }

    if (
      (cleanId === "nv002" || cleanId === "binh.tran@company.vn" || cleanId === "nhanvien@acme.vn" || cleanId === "employee") &&
      password === "123456"
    ) {
      return {
        success: true,
        data: { user: DEMO_ACCOUNTS.employee, token: "demo-employee-token" },
        message: "Đăng nhập Nhân viên thành công",
      };
    }

    return {
      success: false,
      data: null,
      message: "Mã nhân viên hoặc mật khẩu không chính xác.",
    };
  },

  me: async () => {
    try {
      const res = await fetch(`${API_BASE}/?action=me`, {
        credentials: "include",
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline
    }

    // Kiểm tra session lưu trong localStorage
    try {
      const saved = localStorage.getItem("qlns-auth-user");
      if (saved) {
        return {
          success: true,
          data: { user: JSON.parse(saved) },
          message: "Lấy thông tin thành công từ phiên",
        };
      }
    } catch {
      // ignore
    }

    return { success: false, data: null, message: "Chưa đăng nhập" };
  },

  logout: async () => {
    try {
      await fetch(`${API_BASE}/?action=logout`, {
        credentials: "include",
      });
    } catch {
      // ignore
    }
    localStorage.removeItem("qlns-auth-user");
    return { success: true, message: "Đã đăng xuất" };
  },

  employeeDashboard: async () => {
    try {
      const res = await fetch(`${API_BASE}/?action=employee/dashboard`, {
        credentials: "include",
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // offline
    }
    return { success: true, data: null };
  },
};

