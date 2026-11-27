# 🔐 Hướng Dẫn Đăng Nhập & Danh Sách Tài Khoản Hệ Thống QLNS (PeopleOS)

Hệ thống Quản lý Nhân sự **PeopleOS** hỗ trợ đăng nhập bằng **Mã nhân viên** (hoặc Email) kết hợp **Mật khẩu**. Hệ thống tự động phân quyền theo chuẩn RBAC (`ADMIN` và `EMPLOYEE`).

---

## 📌 Tài Khoản Đăng Nhập

Database mẫu có 5 tài khoản `NV001`–`NV005`, đều dùng mật khẩu `123456` (sau khi chạy `seed_passwords.php`). Hai tài khoản tiêu biểu:

### 1. 🛡️ Tài Khoản Quản Trị Viên (Admin)
> Dành cho ban giám đốc, phòng nhân sự (HR) để quản lý nhân sự, hợp đồng và bảng lương.

| Thông tin | Giá trị đăng nhập |
| :--- | :--- |
| **Mã nhân viên** | `NV001` *(Điền mã này vào ô Mã nhân viên)* |
| **Email liên kết** | `an.nguyen@company.vn` |
| **Mật khẩu** | `123456` |
| **Họ và tên** | Nguyễn Văn An |
| **Vai trò (Role)** | `ADMIN` (Quản trị viên) |
| **Chức vụ** | Giám đốc nhân sự |
| **Quyền hạn chính** | • **Quản trị nhân sự**: Thêm, sửa, xóa, tìm kiếm hồ sơ nhân viên trong tổ chức.<br>• **Quản lý hợp đồng & Bảng lương**: Thiết lập lương cơ bản, lương đóng BHXH, phụ cấp, người phụ thuộc, xuất file CSV/Excel. |

---

### 2. 👤 Tài Khoản Nhân Viên (Employee)
> Dành cho từng nhân sự tra cứu thông tin cá nhân. Giao diện nhân viên được trang bị **Dashboard bên cạnh (Sidebar)** để xem các mục liên quan (Lương, Lịch tuần, Chấm công, Hợp đồng). Nhân viên **chỉ xem** thông tin chấm công.

| Thông tin | Giá trị đăng nhập |
| :--- | :--- |
| **Mã nhân viên** | `NV002` *(Điền mã này vào ô Mã nhân viên)* |
| **Email liên kết** | `binh.tran@company.vn` |
| **Mật khẩu** | `123456` |
| **Họ và tên** | Trần Thị Bình |
| **Vai trò (Role)** | `EMPLOYEE` (Nhân viên) |
| **Phòng ban** | Thiết kế |
| **Vị trí** | Senior UI/UX Designer |
| **Các mục trên Dashboard bên cạnh** | Toàn bộ số liệu lấy từ API `?action=employee/dashboard`:<br>• **1. Tổng quan cá nhân**: lương Net/Gross kỳ gần nhất, ngày công, giờ OT, quy mô team, lịch tuần hiện tại.<br>• **2. Hồ sơ cá nhân**: mã NV, phòng ban, chức danh, ngày vào làm, email, hợp đồng.<br>• **3. Đội ngũ**: đồng nghiệp cùng phòng ban (bảng `users`).<br>• **4. Lương & Phiếu lương**: thông số hợp đồng (`contracts`) và lịch sử kỳ lương (`payroll_items`), mở **Phiếu lương điện tử**.<br>• **5. Lịch làm việc tuần**: ca chuẩn `08:30 - 17:30` Thứ Hai–Thứ Sáu.<br>• **6. Chấm công**: tổng công và OT theo từng kỳ lương.<br>• **7. Hợp đồng & Phúc lợi**: lương HĐLĐ, BHXH, phụ cấp, người phụ thuộc. Các thông tin chưa có trong database hiển thị "Chưa cập nhật". |

### 3. 🧪 Tài Khoản Kiểm Thử Đầy Đủ — `TEST01`
> Có đủ dữ liệu để thử mọi chức năng nhân viên: hợp đồng (chi nhánh Hà Nội, thử việc 60 ngày), chấm công tháng 11/2026, lương tạm tính, nghỉ phép và **hướng dẫn lần đầu đăng nhập**.

| Thông tin | Giá trị đăng nhập |
| :--- | :--- |
| **Mã nhân viên** | `TEST01` |
| **Email liên kết** | `test01@peopleos.vn` |
| **Mật khẩu** | `123456` |
| **Họ và tên** | Phạm Minh Test |
| **Vai trò (Role)** | `EMPLOYEE` · Kỹ thuật · Kỹ sư phần mềm · Thử việc |
| **Xem lại hướng dẫn** | Menu tài khoản (góc dưới thanh bên) → **Xem lại hướng dẫn** |

### 4. 📋 Toàn Bộ Tài Khoản Trong Database (mật khẩu đều là `123456`)

| Mã NV | Họ và tên | Vai trò | Phòng ban | Vị trí | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `NV001` | Nguyễn Văn An | ADMIN | Nhân sự | Giám đốc nhân sự | Đang làm việc |
| `NV002` | Trần Thị Bình | EMPLOYEE | Thiết kế | Senior UI/UX Designer | Đang làm việc |
| `NV003` | Lê Hoàng Cường | EMPLOYEE | Kỹ thuật | Backend Developer | Đang làm việc |
| `NV004` | Phạm Minh Đức | EMPLOYEE | Kỹ thuật | Frontend Developer | Đang làm việc |
| `NV005` | Hoàng Thị Em | EMPLOYEE | Kinh doanh | Sales Executive | Thử việc |
| `NV006` | Nguyễn Ngọc Lan | EMPLOYEE | Kế toán | Kế toán tổng hợp | Đang làm việc |
| `NV007` | Võ Quốc Quân | EMPLOYEE | Kỹ thuật | QA Engineer | Thử việc |
| `NV008` | Phạm Thu Mai | EMPLOYEE | Nhân sự | Chuyên viên tuyển dụng | Đang làm việc |
| `NV009` | Đỗ Anh Tuấn | EMPLOYEE | Kinh doanh | Chuyên viên kinh doanh | Nghỉ phép |
| `NV010` | Bùi Thảo Linh | EMPLOYEE | Thiết kế | Graphic Designer | Đang làm việc |
| `NV011` | Lê Thị Ứng Viên | EMPLOYEE | Marketing | Chuyên viên Marketing | Thử việc *(tạo qua luồng tuyển dụng → duyệt hợp đồng)* |
| `TEST01` | Phạm Minh Test | EMPLOYEE | Kỹ thuật | Kỹ sư phần mềm | Thử việc |

> Tài khoản mới **chỉ được tạo khi HR duyệt hồ sơ hợp đồng** (Quản trị → Hồ sơ hợp đồng). Mật khẩu mặc định hiển thị một lần khi duyệt.

### 5. 🌐 Trang Công Khai (không cần đăng nhập)
- `/tuyen-dung` — ứng viên nộp hồ sơ ứng tuyển.
- `/hop-dong/<token>` — ứng viên tải mẫu và nộp hợp đồng (link gửi qua email sau khi được duyệt).

---

## 🚀 Hướng Dẫn Đăng Nhập
1. Mở giao diện ứng dụng.
2. Tại ô **Mã nhân viên**: Nhập `NV001` (để vào Admin), `NV002` hoặc `TEST01` (để vào Nhân viên).
3. Tại ô **Mật khẩu**: Nhập `123456`.
4. Bấm **Đăng nhập**.

---

## 🛠️ Hướng Dẫn Khởi Động Dự Án

Chi tiết từng bước (phpMyAdmin, `env.php`, proxy, danh sách API) xem tại **[HUONG_DAN_KET_NOI_API.md](HUONG_DAN_KET_NOI_API.md)**. Tóm tắt:

```bash
# 1. Import QLNS-Database.sql bằng phpMyAdmin, rồi đặt mật khẩu mẫu
cp Back-End/configs/env.example.php Back-End/configs/env.php   # sửa DB_PORT/DB_PASSWORD nếu cần
php Back-End/database/seed_passwords.php

# 2. Backend
cd Back-End
php -S localhost:8000 index.php

# 3. Frontend (terminal khác)
cd Front-End
npm install
npm run dev        # http://localhost:5173
```

Frontend **bắt buộc** cần backend đang chạy, không còn chế độ offline/dữ liệu mẫu.
