# PeopleOS (QLNS) — Quản lý nhân sự

Ứng dụng quản lý nhân sự & tiền lương tiếng Việt: **React (Vite) + PHP + MySQL**.
README này ghi lại **những gì đã làm, dùng công cụ gì, và thông tin lấy từ đâu**.

```
QLNS/
├── Front-End/          React 19 + Vite 8 + Tailwind v4 + shadcn/ui + Animate UI
├── Back-End/           PHP 8 thuần (router ?action=…, PDO), không framework
│   ├── controllers/    Auth · Employee · Contract · ContractDocument · Meta · Payroll · Profile · Leave · Home
│   ├── models/         User · Contract · ContractDocument · Branch · SalaryAdjustment · Payroll · AttendanceRecord · LeaveRequest
│   ├── services/       PayrollEngine · PayrollConfig · PayrollInputs · Contract{Schema,Template,Reader,Validator,Intake} · PayrollPeriodPolicy · ContractSalaryAdjustmentPolicy · LeavePolicy · Attendance · Payslip · Xlsx…
│   └── database/       migrations/001…010, seed_passwords.php, backfill_payroll_breakdown.php
├── test-backend.php    Kiểm thử PHP thuần (nghỉ phép, kỳ lương và tính lương/thuế), không cần CSDL
├── QLNS-Database.sql   Dump đầy đủ database `qlns` (đã gồm migration 001–009, 12 tài khoản, chấm công, lương T1–T11/2026)
├── HUONG_DAN_KET_NOI_API.md   Hướng dẫn chi tiết kết nối API
└── TAI_KHOAN_DANG_NHAP.md     Tài khoản mẫu
```

---

## 1. Những gì đã làm

### 1.1 Giao diện (Front-End)

| Hạng mục                                                 | Chi tiết                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Làm lại toàn bộ giao diện** quản trị và cổng nhân viên | Theo ngôn ngữ thiết kế Apple: nền sáng / tile tối, một màu nhấn xanh, nút pill, chế độ **sáng / tối**                                                                                                                                                                                                                                                                     |
| **Chữ**                                                  | `SF Pro Text` cho nội dung, `SF Pro Display` cho tiêu đề (như apple.com); máy không phải Apple dùng Inter / Segoe UI. Cỡ chữ co giãn theo màn hình bằng `clamp()`                                                                                                                                                                                                         |
| **Số liệu tĩnh**                                         | Bỏ hiệu ứng nhảy số (counting/sliding number), số hiển thị cố định                                                                                                                                                                                                                                                                                                        |
| **Thanh chọn trên dashboard**                            | Ô được chọn có màu tương phản với nền và **trượt** giữa các mục (motion `layoutId`), không nhấp nháy mất/hiện                                                                                                                                                                                                                                                             |
| **Biểu đồ đường**                                        | Các biểu đồ theo thời gian dùng `LineChart` (Recharts, nét thẳng, không tô nền): thu nhập (Gross / thực nhận), quỹ lương theo kỳ (Gross / Net), giờ làm & OT theo ngày, ngày công theo kỳ (công chuẩn nét đứt), OT theo kỳ. Helper chung `lineProps` / `lineCursor` trong `components/ui/chart.jsx`. Quỹ lương theo phòng ban vẫn là thanh ngang (so sánh giữa các phòng) |
| **Logo mới**                                             | Ô vuông xanh với 3 cột tăng dần, mỗi cột đội một "cái đầu" tròn (đội ngũ đi lên). Rê chuột: ô nghiêng nhẹ, các cột lần lượt thụt xuống rồi bật lên (`components/app/brand.jsx`); màn hình chờ lặp hiệu ứng liên tục; `favicon.svg` cùng hình                                                                                                                              |
| **Bỏ nhãn UC-02**                                        | Mục "Chấm công & OT" ở trang quản trị không còn nhãn UC-02 trên menu và tiêu đề trang                                                                                                                                                                                                                                                                                     |
| **Lịch chấm công theo tháng**                            | Lịch 7 cột từ Thứ Hai: ngày đi làm, ca làm, giờ vào/ra, đi muộn, nghỉ phép, vắng; tổng số buổi đi làm, buổi nghỉ, giờ làm, giờ OT, phút đi muộn                                                                                                                                                                                                                           |
| **Đổi ảnh đại diện**                                     | Hồ sơ nhân viên: chọn ảnh → thu nhỏ trên trình duyệt → lưu vào cột `users.avatar`; ảnh đặt giữa, không ảnh nền                                                                                                                                                                                                                                                            |
| **Responsive**                                           | Sửa lỗi bố cục ở khung 773×817 (trang hồ sơ) và các màn hẹp; bảng ẩn cột phụ trên mobile                                                                                                                                                                                                                                                                                  |
| **Bỏ motion graphic** ở trang đăng nhập                  | Theo yêu cầu, giữ giao diện tối giản                                                                                                                                                                                                                                                                                                                                      |

### 1.2 Chức năng nhân sự mới: **Nghỉ phép**

Sau khi rà các chức năng một hệ thống HR cần có, phần **đơn nghỉ phép** còn thiếu nên đã được bổ sung đủ từ CSDL tới giao diện:

- **Nhân viên** (`/nhan-vien/nghi-phep`): xem quỹ phép năm (tổng / đã nghỉ / đang chờ / còn lại), tạo đơn (phép năm, nghỉ ốm, không lương, việc riêng có lương) với xem trước số ngày làm việc và phép còn lại, huỷ đơn đang chờ.
- **Quản trị** (`/admin/nghi-phep`): thống kê (chờ duyệt, đang nghỉ hôm nay, số ngày đã duyệt trong năm, đã từ chối), lọc theo trạng thái, tìm kiếm, **duyệt** hoặc **từ chối** (bắt buộc ghi lý do).
- **Đơn được duyệt tự ghi trạng thái `LEAVE`** vào `attendance_records` → hiện ngay trên lịch chấm công tháng của nhân viên.
- **Quy tắc nghiệp vụ** (`Back-End/services/LeavePolicy.php`, hàm thuần, có kiểm thử):
  - 12 ngày phép năm; năm đầu tính theo tỉ lệ số tháng làm việc; +1 ngày cho mỗi 5 năm thâm niên.
  - Chỉ tính ngày T2–T6; tối đa 30 ngày làm việc mỗi đơn; không vắt sang năm khác.
  - Mọi loại đơn nghỉ, kể cả nghỉ ốm, không được bắt đầu trong quá khứ.
  - Chặn đơn trùng ngày với đơn đang chờ / đã duyệt; chặn vượt quỹ phép (tính cả đơn đang chờ).
  - Duyệt / từ chối chạy trong transaction và chỉ áp dụng cho đơn `PENDING` (không duyệt 2 lần).
- **Tệp mới:** `migrations/005_leave_requests.sql` (đã gộp vào `QLNS-Database.sql`), `LeavePolicy.php`, `LeaveRequestModel.php`, `LeaveController.php`, `Front-End/src/lib/leave.js`, `pages/employee/leave.jsx`, `pages/admin/leave.jsx`, `components/ui/textarea.jsx`.
- **API:** `GET/POST employee/leave`, `POST employee/leave/cancel&id=`, `GET leave/requests[&status=]` (ADMIN), `POST leave/review&id=` (ADMIN).

### 1.3 Lọc gọn code Front-End (không mất tính năng)

- Xoá **23 tệp trùng lặp** dạng `* 2.jsx` / `index 2.css` (bản sao do Finder/iCloud tạo).
- Xoá component không còn được dùng: `app-shell.jsx`, `popover`, `switch`, `counting-number`, `sliding-number` (cả bản `components` lẫn `primitives`).
- Gỡ thư viện không dùng: `react-use-measure`, `tslib`.
- Bỏ `export` của hàm chỉ dùng nội bộ (`SectionTitle` bị xoá; `callApi`, `http`, `toNumbers`, `PAYOUT_PARTS`, `weekdaysIn`, `dateKey`, `minutes` chuyển thành nội bộ).
- Định dạng lại 4 tệp dài bằng Prettier (`Front-End/.prettierrc.json`).
- Kết quả: **−~5.000 dòng**, `npm run build` vẫn thành công, toàn bộ kiểm thử vẫn đạt.

### 1.4 Back-End.

- `BaseModel` nay dùng `DB_PORT` khi kết nối (trước đây bỏ qua → MAMP cổng 8889 không kết nối được nếu không có socket).
- Endpoint mới: chấm công theo ngày (`employee/attendance`), ảnh đại diện (`profile/avatar`), nghỉ phép (mục 1.2).

- Dữ liệu lương mẫu: thêm kỳ **T1 → T9/2026** (đã chi trả) cho mọi nhân viên, lương tăng dần sau mỗi tháng (tổng thực nhận T1 ≈ 70,8 tr → T10 ≈ 93,4 tr), tính bằng chính `PayrollEngine`. Có trong `QLNS-Database.sql` và `database/seed_additional_demo_data.sql` (chạy lại nhiều lần không bị trùng).

### 1.5 Kiểm thử (gộp vào mã chính, bỏ thư mục `tests/`)

```
Front-End/src/test-setup.js      jest-dom + polyfill matchMedia/ResizeObserver/IntersectionObserver
Front-End/src/App.test.jsx       luồng UI: đăng nhập, phân quyền, chấm công & OT, cổng NV, nghỉ phép
Front-End/src/lib/lib.test.js    hàm thuần: lịch tháng, nghỉ phép, lương tạm tính, định dạng
test-backend.php                 60 kiểm thử LeavePolicy + PayrollEngine (không cần CSDL/PHPUnit)
```

Cấu hình Vitest nằm ngay trong `Front-End/vite.config.js` (khối `test`). Các script phụ (`serve.sh`, `smoke.sh`, `migrate.php`, `link-frontend.js`) đã bỏ — thay bằng `npm run backend` và phpMyAdmin / `mysql`.

Kết quả lần chạy gần nhất: **Back-End 60/60** (bao gồm các biên biểu thuế, giảm trừ và OT miễn thuế).

### 1.6 Chạy trên nhiều máy (Windows + macOS) a

- Front-End dùng Vite proxy tới `http://localhost:8000` theo mặc định. Nếu đổi địa chỉ backend, cập nhật `BACKEND_URL` trong `Front-End/.env`.
- `package-lock.json` tạo trên macOS thiếu binary native cho Windows (rolldown, lightningcss, tailwind oxide) → đã đưa mọi lock file vào `.gitignore`; mỗi máy tự `npm install`.
- `.gitignore` còn bỏ qua cache Vite, `coverage/`, tệp rác của Windows/macOS (`Thumbs.db`, `desktop.ini`, `._*`, `.DS_Store`) và các tệp bí mật (`env.php`, `.env`).

### 1.7 Hồ sơ hợp đồng, lương tạm tính, hướng dẫn lần đầu

Mọi danh mục (chi nhánh, phòng ban, loại hợp đồng, lương tối thiểu vùng, biểu thuế, ngày lễ) lấy từ API `?action=meta` — Front-End không giữ dữ liệu cứng.

- **Hồ sơ hợp đồng** — `/admin/ho-so-hop-dong`: nhân sự tải mẫu `.docx`, tải lên hợp đồng đã điền + bản scan có chữ ký. Hệ thống đọc file, lưu dữ liệu vào MySQL, **cảnh báo ô còn thiếu** và **từ chối nội dung trái luật** (lương dưới tối thiểu vùng, thử việc quá hạn/lương thử việc < 85%, giờ làm > 48h/tuần, phép năm < 12 ngày…, kèm điều luật). Tài khoản nhân viên **chỉ được tạo khi HR duyệt hợp đồng** đủ thông tin và có bản scan.
- **Lương tạm tính** — thẻ trên trang Tổng quan của nhân viên (`?action=employee/payroll-estimate`): lương đến hôm nay theo ngày công đã chấm + dự kiến cuối tháng, bảo hiểm từng loại, thuế TNCN theo bậc; nút "Xem cách tính" mở công thức chi tiết. Phiếu lương kỳ đã tính có bảng chi tiết (OT theo hệ số, BHXH/BHYT/BHTN, giảm trừ, thuế từng bậc, phần công ty đóng).
- **Hướng dẫn lần đầu** — nhân viên đăng nhập lần đầu được dẫn qua 7 bước; xem lại trong menu tài khoản → "Xem lại hướng dẫn".
- Chức năng tuyển dụng (trang ứng tuyển công khai, link hợp đồng cho ứng viên, EmailJS) đã bỏ — `migrations/010_remove_recruitment.sql` xoá bảng `job_applications` khỏi database cũ.

---

## 2. Cách chạy

Yêu cầu: Node.js 22.12+ (đã thử 24.11), PHP 8.1+ (đã thử 8.3 của MAMP), MySQL (MAMP/XAMPP).

```bash
# 1. Database: import QLNS-Database.sql vào phpMyAdmin (database `qlns`).
#    Đã có database cũ? Chạy các migration còn thiếu (phpMyAdmin → tab SQL, hoặc dòng lệnh):
mysql -u root -p qlns < Back-End/database/migrations/004_avatar_daily_attendance.sql
mysql -u root -p qlns < Back-End/database/migrations/005_leave_requests.sql
mysql -u root -p qlns < Back-End/database/migrations/006_contract_salary_adjustments.sql
#    Thêm dữ liệu lương T1–T9/2026 vào database cũ:
mysql -u root -p qlns < Back-End/database/seed_additional_demo_data.sql
#    Tính lại thuế TNCN các kỳ từ 2026 trở đi (chạy sau khi đã thêm dữ liệu mẫu):
mysql -u root -p qlns < Back-End/database/migrations/007_recalculate_pit_2026.sql
mysql -u root -p qlns < Back-End/database/migrations/008_payroll_change_audit.sql
mysql -u root -p qlns < Back-End/database/migrations/009_recruitment_contracts_payroll_detail.sql
mysql -u root -p qlns < Back-End/database/migrations/010_remove_recruitment.sql
php Back-End/database/backfill_payroll_breakdown.php   # ghi chi tiết phiếu lương cho các kỳ cũ

# 2. Back-End
cp Back-End/configs/env.example.php Back-End/configs/env.php   # sửa thông tin kết nối
php Back-End/database/seed_passwords.php                         # đặt mật khẩu tài khoản mẫu

# 3. Front-End (2 cửa sổ terminal)
cd Front-End && npm install
npm run backend        # = php -S localhost:8000 -t ../Back-End ../Back-End/index.php
npm run dev            # http://127.0.0.1:5173
#    Dùng XAMPP/MAMP thay cho npm run backend: đặt BACKEND_URL trong Front-End/.env
#    (xem Front-End/.env.example) trỏ tới địa chỉ backend đang chạy.
```

Tài khoản mẫu: xem [TAI_KHOAN_DANG_NHAP.md](TAI_KHOAN_DANG_NHAP.md). `env.php` và `.env` đã được `.gitignore`, **không đưa lên GitHub**.

### Chạy kiểm thử

```bash
cd Front-End
npm test               # kiểm thử Front-End (API được mock)
npm run test:ui        # xem kiểm thử trên web (Vitest UI)
npm run test:backend   # kiểm thử PHP thuần (= php ../test-backend.php)
#   php không có trong PATH (MAMP)? /Applications/MAMP/bin/php/php8.3.36/bin/php test-backend.php
```

---

## 3. Đã dùng những gì

| Nhóm        | Công cụ                                                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Front-End   | React 19, Vite 8 (rolldown), React Router 8, TanStack Query 5, axios                                                                     |
| Giao diện   | Tailwind CSS v4, [shadcn/ui](https://ui.shadcn.com), [Animate UI](https://animate-ui.com) (Radix + Motion), lucide-react, sonner (toast) |
| Biểu đồ     | [Recharts](https://recharts.org) 2.15 qua `components/ui/chart.jsx` của shadcn                                                           |
| Hiệu ứng    | [Motion](https://motion.dev) (`layoutId` cho khối trượt, `AnimatePresence` cho danh sách)                                                |
| Back-End    | PHP 8 thuần, PDO prepared statements, phiên `PHPSESSID`                                                                                  |
| CSDL        | MySQL 8 (MAMP cổng 8889)                                                                                                                 |
| Kiểm thử    | Vitest 5, jsdom, Testing Library, PHP CLI                                                                                                |
| Dọn code    | [knip](https://knip.dev) (tìm tệp/export không dùng), Prettier                                                                           |
| Trình duyệt | Claude in Chrome để chụp và kiểm tra giao diện thật ở localhost                                                                          |
| Kỹ năng AI  | Tìm qua [skills.sh](https://skills.sh) (`npx skills find`): HR, code review, refactor, vitest, README                                    |

---

## 4. Thông tin lấy từ đâu

**Nghiệp vụ nhân sự & lương (Việt Nam)**

- [Bộ luật Lao động 2019 (45/2019/QH14)](https://thuvienphapluat.vn/van-ban/Lao-dong-Tien-luong/Bo-Luat-lao-dong-2019-333670.aspx)
  - Điều 113: nghỉ hằng năm 12 ngày; làm chưa đủ 12 tháng tính theo tỉ lệ.
  - Điều 114: thêm 1 ngày cho mỗi đủ 5 năm làm việc.
  - Điều 115: nghỉ việc riêng có hưởng lương (kết hôn, tang…).
  - Điều 98: tiền làm thêm giờ ≥ 150% ngày thường (hệ số OT 1,5 trong `PayrollEngine`).
- Luật Bảo hiểm xã hội: nghỉ ốm do quỹ BHXH chi trả, không trừ phép năm; tỉ lệ người lao động đóng 10,5% (BHXH 8% + BHYT 1,5% + BHTN 1%).
- Thuế TNCN tiền lương (cá nhân cư trú): kỳ tính thuế từ năm 2026 dùng biểu lũy tiến 5 bậc (5%, 10%, 20%, 30%, 35%) và mức giảm trừ gia cảnh 15,5 triệu đồng/tháng cho bản thân, 6,2 triệu đồng/tháng cho mỗi người phụ thuộc; các kỳ trước năm 2026 giữ biểu 7 bậc và mức giảm trừ cũ. Phần tiền làm thêm cao hơn tiền lương giờ bình thường được loại khỏi thu nhập tính thuế. Căn cứ: Luật Thuế TNCN số 109/2025/QH15 áp dụng từ kỳ tính thuế 2026; Nghị quyết 110/2025/UBTVQH15 về mức giảm trừ gia cảnh.
- Kỳ lương 2026 trở đi trong database cũ cần chạy `Back-End/database/migrations/007_recalculate_pit_2026.sql` để cập nhật cả phiếu đã khóa/đã chi. Migration chỉ cập nhật khoản giảm trừ gia cảnh, thuế TNCN và net; không thay đổi gross hoặc khoản bảo hiểm đã lưu.
- Mọi thay đổi OT/tính lại lương và điều chỉnh hợp đồng yêu cầu lý do riêng (10–500 ký tự); lịch sử bảng lương mới lưu người thao tác, thời điểm và giá trị trước/sau. Database cũ cần chạy `Back-End/database/migrations/008_payroll_change_audit.sql`; lịch sử cũ không thể khôi phục.
- Các khoản phụ cấp hiện được lưu thành một số tổng, không có phân loại miễn thuế; do đó hệ thống đang xem toàn bộ phụ cấp này là thu nhập chịu thuế. Thuế khấu trừ tại nguồn giả định nhân viên là cá nhân cư trú làm việc theo hợp đồng từ 3 tháng trở lên; chưa xử lý cá nhân không cư trú, hợp đồng ngắn hạn hoặc tổng hợp nhiều nguồn thu nhập để quyết toán năm.

**Thiết kế**

- [apple.com](https://www.apple.com) và `Front-End/DESIGN.md` (phân tích ngôn ngữ thiết kế Apple, tạo bằng `npx getdesign@latest add apple`): chữ SF Pro Text/Display, tracking âm cho tiêu đề, nút pill, tile tối.
- [Animate UI docs](https://animate-ui.com/docs), [shadcn/ui · Vite](https://ui.shadcn.com/docs/installation/vite), [shadcn charts](https://ui.shadcn.com/charts), [Tailwind CSS · Vite](https://tailwindcss.com/docs/installation/using-vite).
- Tham khảo bố cục dashboard HR: [BambooHR · HR Reporting](https://www.bamboohr.com/hr-software/hr-reporting), [Dribbble · NextHR](https://dribbble.com/shots/26633796-NextHR-Minimal-HRM-Dashboard-Design), [Behance · HRsync](https://www.behance.net/gallery/234247355/HRsync-Modern-HR-Management-Dashboard-UI).

**Kỹ thuật**

- [Vitest](https://vitest.dev/config/), [Testing Library](https://testing-library.com/docs/react-testing-library/intro/), [Vite 8 / rolldown](https://vite.dev/guide/).
- Mọi giao diện và mã được viết riêng trong repo; không sao chép mã hay tài nguyên từ các nguồn tham khảo.
