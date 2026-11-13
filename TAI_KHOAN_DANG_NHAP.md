# 🔐 Hướng Dẫn Đăng Nhập & Danh Sách Tài Khoản Hệ Thống QLNS (PeopleOS)

Hệ thống Quản lý Nhân sự **PeopleOS** hỗ trợ đăng nhập bằng **Mã nhân viên** (hoặc Email) kết hợp **Mật khẩu**. Hệ thống tự động phân quyền theo chuẩn RBAC (`ADMIN` và `EMPLOYEE`).

---

## 📌 Danh Sách 2 Tài Khoản Đăng Nhập

### 1. 🛡️ Tài Khoản Quản Trị Viên (Admin)
> Dành cho ban giám đốc, phòng nhân sự (HR) để quản lý toàn bộ hệ thống, tính lương và **sử dụng máy chấm công nhận diện khuôn mặt (Camera Face ID AI Kiosk)** cũng như **chấm công thủ công** khi camera gặp sự cố.

| Thông tin | Giá trị đăng nhập |
| :--- | :--- |
| **Mã nhân viên** | `NV001` *(Điền mã này vào ô Mã nhân viên)* |
| **Email liên kết** | `an.nguyen@company.vn` |
| **Mật khẩu** | `123456` |
| **Họ và tên** | Nguyễn Văn An |
| **Vai trò (Role)** | `ADMIN` (Quản trị viên) |
| **Chức vụ** | Giám đốc nhân sự |
| **Quyền hạn chính** | • **Chấm công khuôn mặt AI (Face ID Kiosk)**: Mở camera quét nhận diện tự động Check-in (sáng) hoặc Check-out (chiều) theo giờ.<br>• **Khắc phục khi lỗi camera**: Chuyển sang tab Chấm công thủ công để điểm danh bằng tay.<br>• **Quản trị nhân sự**: Thêm, sửa, xóa, tìm kiếm hồ sơ nhân viên trong tổ chức.<br>• **Quản lý hợp đồng & Bảng lương**: Thiết lập lương cơ bản, lương đóng BHXH, phụ cấp, người phụ thuộc, xuất file CSV/Excel. |

---

### 2. 👤 Tài Khoản Nhân Viên (Employee)
> Dành cho từng nhân sự tra cứu thông tin cá nhân. Giao diện nhân viên được trang bị **Dashboard bên cạnh (Sidebar)** để xem các mục liên quan (Lương, Lịch tuần, Chấm công, Hợp đồng). Nhân viên **chỉ xem** kết quả chấm công do camera AI/Quản trị viên ghi nhận.

| Thông tin | Giá trị đăng nhập |
| :--- | :--- |
| **Mã nhân viên** | `NV002` *(Điền mã này vào ô Mã nhân viên)* |
| **Email liên kết** | `binh.tran@company.vn` |
| **Mật khẩu** | `123456` |
| **Họ và tên** | Trần Thị Bình |
| **Vai trò (Role)** | `EMPLOYEE` (Nhân viên) |
| **Phòng ban** | Thiết kế & Trải nghiệm |
| **Vị trí** | Senior UI/UX Designer |
| **Các mục trên Dashboard bên cạnh** | • **1. Tổng quan cá nhân**: Các chỉ số KPI chính, trạng thái chấm công hôm nay (Vào: `08:24`, Ra: `17:30`).<br>• **2. Lương & Phiếu lương**: Lương Net thực nhận (19.2tr), Gross (21tr), lương HĐLĐ (18.5tr), BHXH 10.5% (15tr), phụ cấp (2.5tr), thuế TNCN, mở popup **Phiếu lương điện tử (Payslip Dialog)**.<br>• **3. Lịch làm việc tuần**: Ca làm việc chuẩn `08:30 - 17:30` từ Thứ Hai đến Thứ Sáu, ngày nghỉ tuần Thứ Bảy & Chủ Nhật.<br>• **4. Chấm công & Giờ làm**: Xem chi tiết giờ vào, giờ ra do camera Face ID ghi nhận, tổng 172h làm việc, +6.5h OT, chuyên cần 98.5%, quỹ phép còn lại (8.5/12 ngày).<br>• **5. Hợp đồng & Phúc lợi**: Số hợp đồng, mã số thuế TNCN, mã số sổ BHXH (VssID), tài khoản ngân hàng VCB. |

---

## 🚀 Hướng Dẫn Đăng Nhập
1. Mở giao diện ứng dụng.
2. Tại ô **Mã nhân viên**: Nhập `NV001` (để vào Admin) hoặc `NV002` (để vào Nhân viên).
3. Tại ô **Mật khẩu**: Nhập `123456`.
4. Bấm **Đăng nhập**.

---

## 🛠️ Hướng Dẫn Khởi Động Dự Án

### Khởi động Frontend (React + Vite)
```bash
cd Front-End
npm install
npm run dev
```
Truy cập: `http://localhost:5173`

### Khởi động Backend (PHP MVC)
```bash
cd Back-End
php -S localhost:8888
```
*(Nếu máy chủ PHP chưa bật, Frontend có chế độ offline tự động nhận diện tài khoản `NV001` và `NV002` với mật khẩu `123456` để trải nghiệm mượt mà).*

