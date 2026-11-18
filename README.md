# QLNS · PeopleOS

Giao diện quản lý nhân sự tiếng Việt, dùng **React + JavaScript + Vite, Tailwind CSS v4, shadcn/ui và [Animate UI](https://animate-ui.com/docs) (Motion)**. Phong cách Apple theo `Front-End/DESIGN.md` (`npx getdesign@latest add apple`): nền trắng/parchment, tile tối, một màu nhấn xanh, nút pill; có chế độ **sáng / tối** (nút trên header, hiệu ứng quét View Transition), chuyển trang mượt, số liệu lăn số, bố cục thích ứng desktop/tablet/mobile.

## Chạy dự án

Yêu cầu Node.js 22.12+ hoặc 24+, PHP 8.1+ và MySQL (MAMP/XAMPP).

1. **Database:** import `QLNS-Database.sql` bằng phpMyAdmin (database `qlns`). Nếu đã có `qlns` bản cũ, chạy `Back-End/database/migrations/001_employee_profile.sql`.
2. **Backend:**
   ```bash
   cp Back-End/configs/env.example.php Back-End/configs/env.php   # sửa DB_PORT / DB_PASSWORD
   php Back-End/database/seed_passwords.php                         # mật khẩu mẫu 123456
   cd Back-End && php -S localhost:8000 index.php
   ```
3. **Frontend:**
   ```bash
   cd Front-End
   npm ci
   npm run dev    # http://localhost:5173, proxy /api → http://localhost:8000
   ```

Hướng dẫn đầy đủ (kết nối API, lấy dữ liệu từ phpMyAdmin, thêm API mới, xử lý sự cố): **[HUONG_DAN_KET_NOI_API.md](HUONG_DAN_KET_NOI_API.md)**. Tài khoản đăng nhập: [TAI_KHOAN_DANG_NHAP.md](TAI_KHOAN_DANG_NHAP.md).

```bash
npm test       # Kiểm tra luồng giao diện (API được mock)
npm run build  # Build production vào dist/
```

## Chức năng hiện có

- **Đăng nhập** bằng mã nhân viên hoặc email, phiên PHP (cookie `PHPSESSID`), phân quyền `ADMIN` / `EMPLOYEE`.
- **ADMIN:** tổng quan, danh sách nhân viên (thêm/sửa/xóa ghi thẳng vào database), phòng ban, hợp đồng, dự toán bảng lương, báo cáo CSV, tìm nhanh kiểu Spotlight `⌘K` / `Ctrl+K` (trang + nhân viên).
- **EMPLOYEE:** cổng thông tin cá nhân: hồ sơ, đồng nghiệp cùng phòng, hợp đồng, lịch sử kỳ lương và phiếu lương.

**Nguồn dữ liệu:** toàn bộ lấy từ database MySQL `qlns` qua API PHP (`Back-End/routes/index.php`). Frontend không lưu dữ liệu nhân sự trong trình duyệt; chỉ lựa chọn giao diện sáng/tối được nhớ trong `localStorage`.

## Cấu trúc backend

- `Back-End/index.php`: điểm vào, CORS, bắt lỗi trả JSON.
- `Back-End/routes/index.php`: bảng định tuyến `?action=...`.
- `Back-End/controllers/`: `AuthController`, `EmployeeController`, `PayrollController`, `HomeController`.
- `Back-End/models/`: `UserModel`, `ContractModel`, `PayrollModel` (PDO, prepared statements).
- `Back-End/configs/helper.php`: `json_response`, `read_json_body`, `require_method`, `require_auth`.
- Database `qlns`: `users`, `contracts`, `payroll_periods`, `payroll_items`. `QLNS-Database.sql` chỉ chứa database này.

## Tham khảo thiết kế và kỹ thuật

- [BambooHR · HR Reporting](https://www.bamboohr.com/hr-software/hr-reporting): tổ chức dữ liệu nhân sự và báo cáo.
- [Dribbble · NextHR Minimal HRM Dashboard](https://dribbble.com/shots/26633796-NextHR-Minimal-HRM-Dashboard-Design): phân cấp thị giác, không gian trắng, bố cục tối giản.
- [Behance · HRsync](https://www.behance.net/gallery/234247355/HRsync-Modern-HR-Management-Dashboard-UI): bố cục dashboard và thao tác nhanh.
- [shadcn/ui · Vite](https://ui.shadcn.com/docs/installation/vite) và [Tailwind CSS · Vite](https://tailwindcss.com/docs/installation/using-vite): cấu hình chính thức.

Thiết kế được phát triển riêng trong repo; không sao chép mã hoặc tài nguyên từ các mẫu tham khảo.
