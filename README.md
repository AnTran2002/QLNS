# QLNS · PeopleOS

Giao diện quản lý nhân sự tiếng Việt, dùng **React + JavaScript + Vite, Tailwind CSS v4, shadcn/ui và Recharts**. Phong cách trắng đen, chuyển động nhẹ, bố cục thích ứng desktop/tablet/mobile, font Be Vietnam Pro được đóng gói cục bộ.

## Chạy frontend

Yêu cầu Node.js 22.12+ hoặc 24+ và npm.

```bash
cd Front-End
npm ci
npm run dev
```

Mở URL Local được Vite in trong terminal (mặc định `http://localhost:5173`). Frontend chạy độc lập, không cần PHP/MySQL để xem bản mẫu.

```bash
npm test       # Kiểm tra các luồng tương tác và adapter API
npm run lint  # Kiểm tra React/JavaScript
npm run build # Build production vào dist/
npm run preview
```

## Chức năng hiện có

- Tổng quan: số nhân viên, tình trạng làm việc, quỹ lương hợp đồng, cơ cấu phòng ban, biểu đồ mẫu 3/6 tháng, nhân sự mới và lịch tháng.
- Nhân viên: thêm/sửa/xóa hồ sơ mẫu, kiểm tra email/mã trùng, tìm không dấu, lọc phòng ban và trạng thái, sắp xếp, phân trang, chọn và xuất CSV.
- Phòng ban: cơ cấu 6 phòng ban mẫu, số lượng nhân sự và lương cơ bản; mở danh sách nhân viên đã lọc.
- Hợp đồng: chỉnh lương cơ bản, lương đóng BHXH, phụ cấp và số người phụ thuộc theo các trường trong `qlns.contracts`.
- Bảng lương: dự toán từ các thông số hợp đồng hiện tại; chi tiết từng người và xuất CSV. Chưa tính công, OT, bảo hiểm khấu trừ, thuế hoặc lương thực nhận. Chuyển kỳ chỉ thay đổi kỳ dự toán, chưa có lịch sử lương.
- Báo cáo: xuất CSV danh sách nhân viên, cơ cấu phòng ban, hợp đồng và trạng thái nhân sự.
- Cài đặt: đổi tên tổ chức, xem nguồn dữ liệu, khôi phục bản mẫu.
- Tìm nhanh bằng `⌘K` / `Ctrl+K`, điều hướng bằng bàn phím, menu mobile dạng dialog, hỗ trợ giảm chuyển động.

**Dữ liệu hiện là dữ liệu mẫu**, lưu trong `localStorage` tại trình duyệt (`qlns-workspace-v1`, `qlns-company-v1`). Các số liệu hiện tại được tính từ 24 hồ sơ mẫu. Biểu đồ lịch sử và lịch nhắc việc là dữ liệu minh họa của năm 2026. Nhãn “Dữ liệu mẫu” luôn hiển thị trong giao diện. Chưa có đăng nhập hoặc kết nối dữ liệu nhân sự thực.

## Kết quả kiểm tra backend

1. `Back-End` mới có khung PHP MVC, `BaseModel` dùng PDO và một route Home (`?action=/`). Chưa triển khai API nhân sự, đăng nhập hoặc phân quyền.
2. `Back-End/configs/env.php` được gitignore và chưa có trong checkout. Cần cấu hình kết nối DB và hằng đường dẫn trước khi chạy backend.
3. `QLNS-Database.sql` là bản dump **nhiều database**, gồm cả dữ liệu không liên quan. Không nên import toàn bộ rồi giả định mọi bảng thuộc QLNS.
4. Database **`qlns`** có các bảng `users`, `contracts`, `payroll_periods`, `payroll_items`. Bảng `employees`/`departments` nằm trong database khác (`ph69035_exam_php`), không thuộc schema `qlns`.
5. Phòng ban, chức danh, trạng thái, ngày gia nhập trong frontend là thông tin mở rộng của bản mẫu; cần bổ sung schema/API nếu muốn lưu vào `qlns`. Không gửi mật khẩu về frontend.
6. Tài liệu `Hướng dẫn API Data/API Data UC-01.jpg` định nghĩa `GET /api/contracts`, `GET /api/contracts/{id}`, `PUT /api/contracts/{id}`; các route này **chưa được backend triển khai**.

Adapter cho ba endpoint được đặt tại [`Front-End/src/lib/contracts-api.js`](Front-End/src/lib/contracts-api.js), có xử lý HTTP lỗi, AbortSignal và phản hồi 204. Adapter **chưa được gọi trong giao diện** để tránh nhầm dữ liệu mẫu với dữ liệu thật. Kiểu phản hồi tối thiểu là contract, cần thống nhất thêm thông tin nhân viên từ phép join với `users` khi triển khai API.

```js
import { createContractsApi } from '@/lib/contracts-api'

const api = createContractsApi('https://your-backend.example')
const contracts = await api.list()
await api.update(contracts[0].id, {
  base_salary: 20000000,
  insurance_salary: 12000000,
  dependents_count: 1,
  allowance: 1500000,
})
```

Để dùng thực tế, cần triển khai API và xác thực/phân quyền phía PHP, thống nhất response JSON, bổ sung dữ liệu phòng ban/ngày công, sau đó thay nguồn dữ liệu mẫu. Không thay đổi backend hoặc database trong lần xây giao diện này.

## Tham khảo thiết kế và kỹ thuật

- [BambooHR · HR Reporting](https://www.bamboohr.com/hr-software/hr-reporting): tổ chức dữ liệu nhân sự và báo cáo.
- [Dribbble · NextHR Minimal HRM Dashboard](https://dribbble.com/shots/26633796-NextHR-Minimal-HRM-Dashboard-Design): phân cấp thị giác, không gian trắng, bố cục tối giản.
- [Behance · HRsync](https://www.behance.net/gallery/234247355/HRsync-Modern-HR-Management-Dashboard-UI): bố cục dashboard và thao tác nhanh.
- [shadcn/ui · Vite](https://ui.shadcn.com/docs/installation/vite) và [Tailwind CSS · Vite](https://tailwindcss.com/docs/installation/using-vite): cấu hình chính thức.

Thiết kế được phát triển riêng trong repo; không sao chép mã hoặc tài nguyên từ các mẫu tham khảo.
