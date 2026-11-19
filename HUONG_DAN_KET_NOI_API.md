# Hướng dẫn kết nối API Backend (PHP) vào Frontend (React)

Tài liệu này giải thích dữ liệu đi từ **phpMyAdmin / MySQL** lên giao diện React như thế nào, cách chạy dự án trên máy, và cách thêm một API mới.

> Frontend **không còn dữ liệu mẫu**: không còn `seedEmployees`, không lưu nhân viên trong `localStorage`, không có chế độ đăng nhập offline. Toàn bộ dữ liệu đọc và ghi qua backend PHP, rồi xuống database `qlns`.

---

## 1. Tổng quan kiến trúc

```
┌──────────────┐  SQL   ┌──────────────┐  PDO   ┌──────────────────┐  JSON   ┌───────────────┐  axios  ┌──────────────┐
│  phpMyAdmin  │ ─────▶ │ MySQL `qlns` │ ◀────▶ │ Back-End (PHP)   │ ◀─────▶ │ Vite proxy    │ ◀─────▶ │ React (5173) │
│ (quản trị DB)│        │ users,       │        │ index.php        │         │ /api → :8000  │         │ hooks, pages │
└──────────────┘        │ contracts,   │        │ ?action=...      │         └───────────────┘         └──────────────┘
                        │ payroll_*    │        │ Model/Controller │
                        └──────────────┘        └──────────────────┘
```

- **phpMyAdmin** chỉ là công cụ quản lý MySQL. Frontend **không** kết nối thẳng vào phpMyAdmin hay MySQL: trình duyệt không được giữ mật khẩu database.
- **Backend PHP** là lớp duy nhất nói chuyện với MySQL (qua PDO), rồi trả JSON.
- **Frontend** gọi `/api/?action=...`. Khi chạy dev, Vite chuyển (proxy) request này sang backend, nên frontend và API cùng origin và cookie đăng nhập `PHPSESSID` hoạt động mà không cần cấu hình CORS.

Mọi phản hồi của backend có cùng một dạng:

```json
{ "success": true, "data": { "...": "..." }, "message": "Thông báo tiếng Việt" }
```

Khi lỗi, `success` là `false`, HTTP status là 4xx/5xx và `message` cho biết nguyên nhân.

---

## 2. Chuẩn bị database bằng phpMyAdmin

### 2.1. Database mới (chưa có `qlns`)

1. Mở phpMyAdmin:
   - MAMP: <http://localhost:8888/phpMyAdmin/> (MySQL cổng **8889**, user `root` / mật khẩu `root`)
   - XAMPP: <http://localhost/phpmyadmin/> (MySQL cổng **3306**, user `root` / mật khẩu rỗng)
2. Chọn tab **Import**, chọn file `QLNS-Database.sql` ở thư mục gốc repo, rồi bấm **Go / Thực hiện**.
   File này tự `CREATE DATABASE IF NOT EXISTS qlns` và tạo 4 bảng `users`, `contracts`, `payroll_periods`, `payroll_items` cùng 5 nhân viên mẫu.

### 2.2. Database `qlns` đã có từ trước (bản cũ)

Bản cũ thiếu các cột phòng ban/chức danh/trạng thái/ngày vào làm. Chạy migration:

1. Trong phpMyAdmin, bấm vào database **qlns**, chọn tab **SQL**.
2. Dán nội dung file `Back-End/database/migrations/001_employee_profile.sql`, rồi bấm **Go**.

Migration thêm:

| Bảng | Thay đổi |
| --- | --- |
| `users` | cột `department`, `position`, `status` (`Đang làm việc` / `Thử việc` / `Nghỉ phép`), `joined_at` |
| `payroll_items` | khóa `UNIQUE (period_id, user_id)`: engine tính lương cần khóa này cho `ON DUPLICATE KEY UPDATE` |

> Chỉ chạy migration **một lần**. Chạy lần hai sẽ báo lỗi `Duplicate column name`, lỗi này vô hại.

Đối với UC-02, chạy thêm migration `Back-End/database/migrations/002_payroll_period_unique_month.sql` một lần để bảo đảm mỗi tháng chỉ có một kỳ lương. Nếu database đã có nhiều kỳ cùng `month_year`, cần xử lý dữ liệu trùng trước khi chạy migration này.

### 2.3. Đặt mật khẩu cho tài khoản mẫu

Mật khẩu lưu dạng bcrypt. Sau khi import, chạy một lần:

```bash
php Back-End/database/seed_passwords.php
# → Đã thiết lập mật khẩu 123456 cho 5 tài khoản mẫu.
```

Đăng nhập bằng `NV001` (ADMIN) hoặc `NV002`–`NV005` (EMPLOYEE), mật khẩu `123456`.

---

## 3. Cấu hình và chạy backend

### 3.1. Tạo `env.php`

```bash
cp Back-End/configs/env.example.php Back-End/configs/env.php
```

`env.php` đã được gitignore, nên mỗi máy tự sửa thông số của mình:

```php
define('DB_HOST', '127.0.0.1');
define('DB_PORT', '8889');      // MAMP: 8889 · XAMPP: 3306
define('DB_NAME', 'qlns');
define('DB_USERNAME', 'root');
define('DB_PASSWORD', 'root');  // MAMP: 'root' · XAMPP: ''
define('FRONTEND_ORIGIN', 'http://localhost:5173');
```

> Thông số trong phpMyAdmin là thông số backend cần dùng. Mở phpMyAdmin, xem **Server** ở đầu trang (ví dụ `127.0.0.1:8889`) rồi điền host và port tương ứng vào `env.php`.

### 3.2. Chạy server PHP

```bash
cd Back-End
php -S localhost:8000 index.php
```

> Dùng cổng **8000**. Cổng 8888 thường đã bị Apache của MAMP chiếm.
> Trên macOS có MAMP, có thể gọi trực tiếp: `/Applications/MAMP/bin/php/php8.3.x/bin/php -S localhost:8000 index.php`.

Kiểm tra: mở <http://localhost:8000/?action=/>

```json
{ "success": true, "data": { "backend": "ok", "database": "qlns", "users": 5 }, "message": "Backend đang chạy và đã kết nối database" }
```

Nếu thấy `users` đúng bằng số dòng trong bảng `users` ở phpMyAdmin thì backend đã đọc được database.

**Cách khác:** không cần `php -S`, chạy luôn bằng Apache của MAMP/XAMPP khi repo nằm trong `htdocs`. Khi đó API nằm ở `http://localhost:8888/QLNS/Back-End/` (MAMP) hoặc `http://localhost/QLNS/Back-End/` (XAMPP); xem mục 4.1.

---

## 4. Cấu hình và chạy frontend

### 4.1. Biến môi trường

```bash
cd Front-End
cp .env.example .env.local   # tuỳ chọn, chỉ cần khi backend không ở localhost:8000
```

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `BACKEND_URL` | `http://localhost:8000` | Địa chỉ backend thật mà Vite proxy chuyển tới (chỉ dùng khi dev) |
| `VITE_API_BASE_URL` | `/api` | Đường dẫn axios gọi. Khi build production và backend ở domain khác, đặt URL đầy đủ, ví dụ `https://api.congty.vn` |

### 4.2. Chạy

```bash
npm install
npm run dev     # http://localhost:5173
```

Proxy trong `Front-End/vite.config.js`:

```js
server: {
  proxy: {
    "/api": {
      target: env.BACKEND_URL || "http://localhost:8000",
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/api/, "") || "/",
    },
  },
},
```

Nghĩa là `http://localhost:5173/api/?action=employees` được chuyển tới `http://localhost:8000/?action=employees`.

---

## 5. Danh sách API

Tất cả gọi tới `index.php?action=<tên>`. Các API có dấu 🔒 cần đăng nhập (cookie phiên).

| Action | Method | Quyền | Body / Query | `data` trả về |
| --- | --- | --- | --- | --- |
| `/` | GET | – | – | `{ backend, database, users }` |
| `login` | POST | – | `{ "employee_code": "NV001", "password": "123456" }` (nhận cả email) | `{ user, token }` |
| `me` | GET | 🔒 | – | `{ user, contract, payroll_history, current_period }` |
| `logout` | GET | 🔒 | – | `null` |
| `employee/dashboard` | GET | 🔒 EMPLOYEE | – | `{ user_info, contract, payroll_history[], attendance_summary, current_period, work_schedule, team_members[] }` |
| `employees` | GET | 🔒 ADMIN | – | Mảng nhân viên kèm hợp đồng mới nhất |
| `employees/show` | GET | 🔒 ADMIN | `?id=2` | 1 nhân viên |
| `employees/create` | POST | 🔒 ADMIN | Xem ví dụ bên dưới | Nhân viên vừa tạo (HTTP 201). Mật khẩu mặc định `123456` |
| `employees/update` | PUT | 🔒 ADMIN | `?id=2` + body như create | Nhân viên sau khi sửa |
| `employees/delete` | DELETE | 🔒 ADMIN | `?id=2` | `null` (không cho tự xoá chính mình) |
| `payroll/periods` | POST | 🔒 ADMIN | `{ "month_year": "2026-12", "standard_days": 22 }` | Kỳ lương mới ở trạng thái `DRAFT` |
| `payroll/attendance` | GET | 🔒 ADMIN | `?period_id=2` | Kỳ lương và danh sách nhân viên đầy đủ cùng ngày công/OT hiện tại |
| `payroll/attendance` | PUT/POST | 🔒 ADMIN | `{ "period_id": 2, "entries": [{ "user_id": 2, "actual_days": 22, "ot_hours": 4 }] }` | Lưu lô ngày công/OT và tính lại lương trong cùng transaction |
| `payroll/import` | POST | 🔒 ADMIN | `multipart/form-data`: `period_id`, `file` (.xlsx) | Kiểm tra toàn file rồi nhập nguyên tử, không lưu dở một phần |
| `payroll/run` | POST | 🔒 ADMIN | `{ "period_id": 2 }` | Tính lại và lưu Gross, BHXH 10.5%, TNCN 7 bậc và Net cho toàn kỳ |
| `payroll/calculate` | POST | 🔒 ADMIN | `{ user_id, period_id, actual_days, ot_hours }` | Kết quả tính lương (kỳ phải ở trạng thái `DRAFT`) |

File Excel UC-02 cần có worksheet đầu tiên với hàng tiêu đề `employee_code`, `actual_days`, `ot_hours` (hoặc `Mã nhân viên`, `Ngày công`, `Giờ OT`). Mỗi mã nhân viên chỉ xuất hiện một lần; file tối đa 10 MB và 10.000 dòng. Backend yêu cầu bật PHP extension `zip` để đọc `.xlsx`; cấu hình PHP cần cho phép `upload_max_filesize=10M` và `post_max_size` lớn hơn 10 MB. Nhập Excel và chỉnh sửa grid đều chỉ ghi vào kỳ `DRAFT`, từ chối nhân viên không tồn tại/không có hợp đồng và rollback toàn bộ nếu có lỗi.

UC-03 chỉ chạy trên kỳ `DRAFT`, yêu cầu mọi nhân viên đều có dòng công/OT và hợp đồng. Hệ thống tính lại toàn bộ kỳ trong một transaction; thiếu dữ liệu, công/OT ngoài giới hạn hoặc lỗi database sẽ không lưu kết quả dở dang. API trả `calculated_count`, tổng Gross/BHXH/TNCN/Net và các dòng lương đã tính. Engine dùng công thức prorate theo ngày công, OT hệ số 1.5, bảo hiểm 10.5% trên lương đóng bảo hiểm và biểu thuế lũy tiến 7 bậc hiện có trong `PayrollEngine`.

Mỗi bản ghi nhân viên (`employees`, `employees/show`, `employees/create`, `employees/update`):

```json
{
  "id": 2,
  "employee_code": "NV002",
  "full_name": "Trần Thị Bình",
  "email": "binh.tran@company.vn",
  "role": "EMPLOYEE",
  "department": "Thiết kế",
  "position": "Senior UI/UX Designer",
  "status": "Đang làm việc",
  "joined_at": "2026-01-02",
  "contract_id": 2,
  "base_salary": 18500000,
  "insurance_salary": 15000000,
  "allowance": 2500000,
  "dependents_count": 1
}
```

Body khi tạo hoặc sửa nhân viên (bỏ `id`, `role`, `contract_id`):

```json
{
  "employee_code": "NV006",
  "full_name": "Phạm Thu Hà",
  "email": "ha.pham@company.vn",
  "department": "Kinh doanh",
  "position": "Sales Executive",
  "status": "Thử việc",
  "joined_at": "2026-11-15",
  "base_salary": 12000000,
  "insurance_salary": 10000000,
  "allowance": 1000000,
  "dependents_count": 0
}
```

Mã lỗi thường gặp:

| HTTP | Khi nào |
| --- | --- |
| 400 | Thiếu hoặc sai `id`, body không phải JSON |
| 401 | Chưa đăng nhập hoặc sai mật khẩu |
| 403 | Đăng nhập nhưng sai quyền (EMPLOYEE gọi API của ADMIN) |
| 404 | Không có bản ghi hoặc action không tồn tại |
| 405 | Sai method (ví dụ GET vào `employees/create`) |
| 409 | Trùng mã nhân viên/email, hoặc tự xoá tài khoản đang đăng nhập |
| 422 | Dữ liệu không hợp lệ (`message` liệt kê từng lỗi) |
| 500 | Lỗi database/máy chủ (`message` có chi tiết, chỉ nên bật khi dev) |

Thử nhanh bằng `curl` (lưu cookie vào file `cj`):

```bash
curl -c cj -H 'Content-Type: application/json' \
     -d '{"employee_code":"NV001","password":"123456"}' \
     'http://localhost:8000/?action=login'

curl -b cj 'http://localhost:8000/?action=employees'
```

---

## 6. Frontend gọi API như thế nào

### 6.1. Các file liên quan

| File | Vai trò |
| --- | --- |
| `Front-End/src/lib/api-client.js` | Axios dùng chung (`withCredentials`), hàm `callApi(action, { method, data, params })` trả về `data` hoặc ném `ApiError` |
| `Front-End/src/lib/auth-api.js` | `login`, `me`, `logout`, `employeeDashboard` |
| `Front-End/src/lib/employees-api.js` | `list`, `get`, `create`, `update`, `remove` |
| `Front-End/src/hooks/use-auth.js` | Gọi `me` khi mở trang để khôi phục phiên, cung cấp `login` / `logout` |
| `Front-End/src/hooks/use-workspace.js` | Tải danh sách nhân viên (ADMIN), `saveEmployee`, `removeEmployee`, `reload` |
| `Front-End/src/features/employee-dashboard.jsx` | Cổng nhân viên, gọi `employee/dashboard` |

### 6.2. `callApi`: điểm vào duy nhất

```js
import { callApi } from "@/lib/api-client";

// GET  /api/?action=employees
const employees = await callApi("employees");

// GET  /api/?action=employees/show&id=2
const one = await callApi("employees/show", { params: { id: 2 } });

// POST /api/?action=employees/create   (body JSON)
const created = await callApi("employees/create", { method: "POST", data: payload });
```

`callApi` tự xử lý:

- `success: false` hoặc HTTP 4xx/5xx → ném `ApiError` với `message` của backend và `status`;
- backend tắt hoặc sai cổng → `"Không thể kết nối máy chủ. Kiểm tra backend PHP đang chạy."`;
- phản hồi không phải JSON (thường do `BACKEND_URL` trỏ sai, trả về trang HTML) → báo lỗi định dạng.

### 6.3. Dùng trong component

```jsx
import { useEffect, useState } from "react";
import { employeesApi } from "@/lib/employees-api";

export function EmployeeCount() {
  const [count, setCount] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    employeesApi
      .list()
      .then((rows) => setCount(rows.length))
      .catch((err) => setError(err.message)); // message tiếng Việt từ backend
  }, []);

  if (error) return <p role="alert">{error}</p>;
  return <p>{count ?? "Đang tải…"} nhân viên</p>;
}
```

Trong `App.jsx`, dữ liệu nhân viên lấy qua hook có sẵn:

```jsx
const { employees, loading, error, reload, saveEmployee, removeEmployee } =
  useWorkspace(user?.role === "ADMIN");
```

---

## 7. Thêm một API mới (ví dụ: danh sách kỳ lương)

Đi lần lượt **Model → Controller → Route → API frontend → Component**.

**① Model**: `Back-End/models/PayrollModel.php`

```php
public function getAllPeriods()
{
    return $this->db->query(
        "SELECT id, month_year, standard_days, status FROM payroll_periods ORDER BY month_year DESC"
    )->fetchAll();
}
```

**② Controller**: `Back-End/controllers/PayrollController.php`

```php
public function periods()
{
    if (!require_method('GET') || !require_auth('ADMIN')) {
        return;
    }
    json_response(200, (new PayrollModel())->getAllPeriods(), 'Lấy danh sách kỳ lương thành công');
}
```

`require_method`, `require_auth` và `json_response` nằm trong `Back-End/configs/helper.php`.

**③ Route**: `Back-End/routes/index.php`

```php
'payroll/periods' => (new PayrollController)->periods(),
```

Kiểm tra: `curl -b cj 'http://localhost:8000/?action=payroll/periods'`

**④ API frontend**: tạo `Front-End/src/lib/payroll-api.js`

```js
import { callApi } from "@/lib/api-client";

export const payrollApi = {
  periods: () => callApi("payroll/periods"),
  calculate: (body) => callApi("payroll/calculate", { method: "POST", data: body }),
};
```

**⑤ Component**: gọi `payrollApi.periods()` trong `useEffect` hoặc một hook riêng, như mục 6.3.

> Luôn dùng prepared statement (`prepare` + `execute` với tham số) cho dữ liệu người dùng gửi lên. Với `PDO::ATTR_EMULATE_PREPARES = false`, mỗi tham số có tên (`:email`) chỉ được dùng **một lần** trong câu SQL.

---

## 8. Dữ liệu sửa trong phpMyAdmin có lên giao diện không?

**Có.** Backend đọc MySQL ở mỗi request, frontend không lưu bản sao nào.

1. Trong phpMyAdmin, sửa trực tiếp một dòng (ví dụ đổi `position` của `NV003` trong bảng `users`).
2. Trên giao diện ADMIN, vào **Cài đặt → Tải lại dữ liệu**, hoặc tải lại trang (F5).
3. Giá trị mới hiển thị ngay.

Mối liên hệ giữa bảng và màn hình:

| Màn hình | Bảng / cột |
| --- | --- |
| Danh sách nhân viên, phòng ban, tìm nhanh | `users` (`employee_code`, `full_name`, `email`, `department`, `position`, `status`, `joined_at`) |
| Hợp đồng, dự toán bảng lương | `contracts` (bản ghi mới nhất của mỗi user) |
| Cổng nhân viên → Lương, Chấm công | `payroll_items` JOIN `payroll_periods` |
| Cổng nhân viên → Đội ngũ | `users` cùng `department` |

Thêm nhân viên trong phpMyAdmin:

- Bảng `users`: `password` phải là chuỗi bcrypt. Dễ nhất là thêm qua giao diện ADMIN (mật khẩu mặc định `123456`), hoặc dùng hàm PHP `password_hash('123456', PASSWORD_DEFAULT)` để sinh chuỗi.
- Bảng `contracts`: thêm một dòng với `user_id` tương ứng để có thông tin lương.

> Những thông tin chưa có cột trong database (CCCD, số điện thoại, địa chỉ, mã số thuế, tài khoản ngân hàng, giờ check-in từng ngày) đang hiển thị **"Chưa cập nhật"**. Muốn lưu, thêm cột hoặc bảng mới, rồi trả thêm field trong `EmployeeController::dashboard()`.

---

## 9. Xử lý sự cố

| Triệu chứng | Nguyên nhân và cách sửa |
| --- | --- |
| Giao diện báo *"Không thể kết nối máy chủ…"* hoặc Vite báo `ECONNREFUSED` | Backend PHP chưa chạy hoặc không nghe trên cổng 8000. Chạy `php -S localhost:8000 index.php` trong thư mục `Back-End`, kiểm tra `BACKEND_URL=http://localhost:8000`, rồi khởi động lại Vite |
| *"Phản hồi từ backend không đúng định dạng JSON"* | `BACKEND_URL` trỏ vào trang HTML (ví dụ trang chủ MAMP). Mở URL đó trong trình duyệt để xem |
| `Lỗi cơ sở dữ liệu: SQLSTATE[HY000] [2002] Connection refused` | Sai `DB_HOST`/`DB_PORT` trong `env.php` hoặc MySQL chưa bật. MAMP dùng 8889, XAMPP dùng 3306 |
| `SQLSTATE[HY000] [1049] Unknown database 'qlns'` | Chưa import `QLNS-Database.sql` (mục 2.1) |
| `Unknown column 'u.department'` | Database bản cũ, cần chạy migration `001_employee_profile.sql` (mục 2.2) |
| Đăng nhập báo sai mật khẩu với `123456` | Chưa chạy `seed_passwords.php` (mục 2.3) |
| Đăng nhập được nhưng F5 lại bị đăng xuất / API trả 401 | Cookie phiên không được gửi: phải gọi qua `/api` (proxy) hoặc đúng `FRONTEND_ORIGIN`; không mở frontend bằng `127.0.0.1` khi cấu hình `localhost` |
| `php -S localhost:8888` báo *Address already in use* | Apache của MAMP đang dùng 8888. Dùng 8000 |
| Thiếu `env.php` | Backend trả JSON 500 *"Thiếu Back-End/configs/env.php — hãy sao chép từ configs/env.example.php"* (mục 3.1) |
