# TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)

## Hệ thống Quản lý Nhân sự – QLNS (PeopleOS)

| Thông tin | Nội dung |
|---|---|
| Phiên bản tài liệu | 1.0 |
| Phiên bản ứng dụng | Front-End 2.0.0 |
| Ngày lập | 23/11/2026 |
| Trạng thái | Đang triển khai / tài liệu hóa hệ thống hiện hành |
| Kiến trúc | React 19 + Vite + PHP thuần + MySQL |
| Tài liệu tham chiếu | README.md, HUONG_DAN_KET_NOI_API.md, TAI_KHOAN_DANG_NHAP.md, Front-End/DESIGN.md |

---

## 1. Giới thiệu

### 1.1 Mục đích

Tài liệu này mô tả đầy đủ phạm vi, vai trò, yêu cầu chức năng, yêu cầu phi chức năng, dữ liệu, API, giao diện, ràng buộc và tiêu chuẩn kiểm thử của hệ thống QLNS. Tài liệu dùng làm căn cứ cho phát triển, triển khai, bảo trì và bàn giao dự án.

### 1.2 Phạm vi dự án

QLNS là ứng dụng web quản lý nhân sự và tiền lương bằng tiếng Việt. Hệ thống hỗ trợ hai khu vực sử dụng:

- Khu vực quản trị dành cho ADMIN.
- Cổng tự phục vụ dành cho EMPLOYEE.

Phạm vi hiện hành gồm:

- Đăng nhập, xác thực phiên và phân quyền RBAC.
- Quản lý nhân viên và phòng ban.
- Quản lý hợp đồng lao động.
- Điều chỉnh lương theo thời điểm hiệu lực.
- Quản lý kỳ lương, ngày công, OT và tính lương.
- Nhập dữ liệu chấm công từ Excel.
- Khóa sổ kỳ lương và xuất danh sách chuyển khoản.
- Xem và tải phiếu lương.
- Chấm công theo ngày và xem lịch tháng.
- Quản lý đơn nghỉ phép.
- Cập nhật ảnh đại diện.
- Giao diện sáng/tối, responsive và kiểm thử tự động.

### 1.3 Mục tiêu

- Quản lý hồ sơ nhân viên tập trung.
- Giảm thao tác thủ công trong tính lương.
- Đảm bảo dữ liệu lương và kỳ lương được xử lý nhất quán.
- Cho phép nhân viên tra cứu lương, hợp đồng, chấm công và nghỉ phép.
- Áp dụng các quy tắc cơ bản về pháp lý lao động và thuế thu nhập cá nhân tại Việt Nam.

### 1.4 Đối tượng và vai trò

| Vai trò | Mô tả |
|---|---|
| ADMIN | Quản lý nhân viên, phòng ban, hợp đồng, ngày công/OT, kỳ lương, nghỉ phép và dữ liệu thanh toán. |
| EMPLOYEE | Quản lý hồ sơ cá nhân, xem lương, chấm công, đồng nghiệp và gửi/huỷ đơn nghỉ phép. |

### 1.5 Thuật ngữ

| Thuật ngữ | Định nghĩa |
|---|---|
| Gross | Tổng thu nhập trước bảo hiểm và thuế. |
| Net | Lương thực nhận sau trích bảo hiểm và thuế TNCN. |
| OT | Giờ làm thêm ngoài giờ. |
| DRAFT | Kỳ lương đang nhập và tính toán. |
| LOCKED | Kỳ lương đã khóa sổ, không thể sửa dữ liệu công/OT. |
| PAID | Kỳ lương đã được đánh dấu đã thanh toán. |
| PENDING | Đơn nghỉ phép đang chờ duyệt. |
| APPROVED | Đơn nghỉ phép đã được duyệt. |
| REJECTED | Đơn nghỉ phép bị từ chối. |
| CANCELLED | Nhân viên đã huỷ đơn đang chờ duyệt. |

---

## 2. Tổng quan hệ thống

### 2.1 Kiến trúc

```text
Trình duyệt
  React 19 + React Router + TanStack Query
          |
          | HTTP/JSON, PHPSESSID
          v
Proxy Vite / CORS
          |
          v
PHP 8 router (?action=... hoặc RESTful)
          |
          v
Controllers -> Services / Models -> MySQL (PDO)
```

### 2.2 Thành phần

#### 2.2.1 Front-End

- React 19 và Vite 8.
- React Router để phân trang và phân quyền giao diện.
- TanStack Query để tải, cache và làm mới dữ liệu.
- Axios làm lớp truy cập API.
- Tailwind CSS v4, shadcn/ui, Radix, Motion.
- Recharts để vẽ biểu đồ.
- Lucide React cho biểu tượng.
- Sonner để hiển thị thông báo.
- Vitest, jsdom và Testing Library để kiểm thử.

#### 2.2.2 Back-End

- PHP 8 thuần, không framework.
- Router query parameter và một số route RESTful.
- PDO, prepared statement.
- Phiên PHP `PHPSESSID`.
- Tầng Controller, Model, Service và migration.
- Các thành phần tính toán nghiệp vụ:
  - PayrollEngine.
  - PayrollPeriodPolicy.
  - PayrollRunService.
  - PayrollPeriodService.
  - AttendanceService.
  - LeavePolicy.
  - ContractSalaryAdjustmentPolicy.
  - XlsxAttendanceReader.
  - XlsxExportWriter.
  - PayslipRenderer.

#### 2.2.3 Cơ sở dữ liệu

- MySQL 8.
- Database mặc định: `qlns`.
- Charset: `utf8mb4_unicode_ci`.
- InnoDB và khóa ngoại.

### 2.3 Người dùng liên quan

- Nhân viên và nhân sự.
- Quản trị viên/HR.
- Ban giám đốc xem tổng quan.
- Quản trị hệ thống triển khai cấu hình.

---

## 3. Yêu cầu chức năng

## FR-01: Đăng nhập và đăng xuất

### FR-01.1

Hệ thống cho phép người dùng đăng nhập bằng mã nhân viên hoặc email kết hợp mật khẩu.

### FR-01.2

Thông tin đăng nhập sai phải được từ chối bằng HTTP 401 và thông báo “Mã nhân viên hoặc mật khẩu không chính xác”.

### FR-01.3

Sau đăng nhập thành công, hệ thống tạo lại phiên PHP và lưu `user_id`, `role`, `token` trong session.

### FR-01.4

Hệ thống không trả mật khẩu hoặc tài khoản ngân hàng trong phản hồi đăng nhập.

### FR-01.5

Người dùng có thể đăng xuất; thao tác xoá dữ liệu session và cookie phiên.

### FR-01.6

Người chưa đăng nhập truy cập trang bảo vệ sẽ được chuyển về `/login`.

---

## FR-02: Phân quyền truy cập

### FR-02.1

Hệ thống phân quyền bằng RBAC gồm `ADMIN` và `EMPLOYEE`.

### FR-02.2

ADMIN không thể truy cập bằng giao diện EMPLOYEE sai vai trò và ngược lại.

### FR-02.3

API kiểm tra quyền trước khi truy cập dữ liệu nhạy cảm.

### FR-02.4

EMPLOYEE chỉ xem dữ liệu của chính mình cho các chức năng hồ sơ, chấm công, lương và đơn nghỉ phép.

### FR-02.5

ADMIN có quyền truy cập chức năng quản trị nhân sự và lương.

---

## FR-03: Quản lý nhân viên

### FR-03.1

ADMIN xem danh sách nhân viên kèm phòng ban, chức danh, trạng thái và hợp đồng mới nhất.

### FR-03.2

ADMIN xem chi tiết một nhân viên.

### FR-03.3

ADMIN tạo nhân viên với tối thiểu các thông tin:

- Mã nhân viên.
- Họ tên.
- Email.
- Phòng ban.
- Chức danh.
- Trạng thái.
- Ngày gia nhập.
- Lương cơ bản.
- Lương đóng bảo hiểm.
- Phụ cấp.
- Số người phụ thuộc.

### FR-03.4

Mật khẩu mặc định của nhân viên mới là `123456`; tài khoản cần đổi lại bằng công cụ khởi tạo mật khẩu trong môi trường triển khai.

### FR-03.5

ADMIN cập nhật hồ sơ nhân viên nhưng không thay đổi vai trò, hợp đồng hoặc trường dữ liệu quản trị trái phép.

### FR-03.6

Hệ thống không cho nhân viên tự xoá chính mình.

### FR-03.7

Hệ thống không cho xoá nhân viên có dữ liệu kỳ lương đã khóa sổ hoặc đã thanh toán.

### FR-03.8

Giao diện quản trị hỗ trợ tìm kiếm nhân viên và hiển thị theo phòng ban.

---

## FR-04: Quản lý phòng ban

### FR-04.1

Hệ thống hiển thị nhân viên theo phòng ban.

### FR-04.2

Các phòng ban trong dữ liệu hiện hành được lưu trên trường `users.department`.

### FR-04.3

Giao diện tổng quan phòng ban hỗ trợ thống kê nhân viên và quỹ lương theo phòng ban.

---

## FR-05: Quản lý hợp đồng

### FR-05.1

Mỗi nhân viên có thể liên kết với một hợp đồng chứa:

- Lương cơ bản.
- Lương đóng bảo hiểm.
- Số người phụ thuộc.
- Phụ cấp.
- Ngày tạo.

### FR-05.2

ADMIN xem danh sách hợp đồng và chi tiết hợp đồng.

### FR-05.3

Hệ thống chặn sửa trực tiếp hợp đồng đã lưu.

### FR-05.4

Mọi thay đổi mức lương phải tạo bản ghi điều chỉnh hợp đồng.

### FR-05.5

Điều chỉnh hợp đồng yêu cầu:

- Lương cơ bản.
- Lương đóng bảo hiểm.
- Phụ cấp.
- Số người phụ thuộc.
- Lý do điều chỉnh từ 3–500 ký tự.

### FR-05.6

Điều chỉnh có hiệu lực từ tháng kế tiếp so với ngày tạo điều chỉnh.

### FR-05.7

Một hợp đồng chỉ có một điều chỉnh cho mỗi tháng hiệu lực.

### FR-05.8

Hệ thống lưu mức cũ, mức mới, người thay đổi, lý do và thời điểm tạo.

### FR-05.9

ADMIN xem lịch sử điều chỉnh lương theo hợp đồng.

---

## FR-06: Quản lý kỳ lương

### FR-06.1

ADMIN tạo kỳ lương theo định dạng `YYYY-MM`.

### FR-06.2

Kỳ mới có trạng thái mặc định `DRAFT`.

### FR-06.3

Hệ thống không cho tạo kỳ lương cho tháng đã qua.

### FR-06.4

Số ngày công chuẩn mặc định là 22 ngày.

### FR-06.5

Kỳ lương không được trùng tháng.

### FR-06.6

Kỳ lương có thể ở ba trạng thái:

1. `DRAFT`.
2. `LOCKED`.
3. `PAID`.

### FR-06.7

Chỉ kỳ `DRAFT` cho phép nhập và sửa ngày công, OT.

### FR-06.8

Kỳ `LOCKED` không cho chỉnh sửa công, OT hoặc tính lại lương.

### FR-06.9

Phiếu lương chỉ hiển thị cho nhân viên ở kỳ `LOCKED` hoặc `PAID`.

---

## FR-07: Tổng hợp ngày công và nhập OT

### FR-07.1

ADMIN xem danh sách nhân viên đầy đủ cùng dữ liệu công/OT của một kỳ.

### FR-07.2

Ngày công được hệ thống tổng hợp từ các bản ghi chấm công theo ngày có trạng thái `PRESENT`, `LATE` hoặc `REMOTE`. ADMIN chỉ nhập giờ OT trên lưới hoặc qua file Excel; ngày công không thể chỉnh sửa thủ công.

### FR-07.3

Khi lưu hoặc chạy lại bảng lương, hệ thống tính lại ngày công từ dữ liệu chấm công thực tế theo tháng.

### FR-07.4

Giờ OT không được âm.

### FR-07.5

Mỗi nhân viên chỉ có tối đa một dòng công/OT trong một kỳ.

### FR-07.6

Việc lưu dữ liệu công/OT được tính lại lương trong cùng transaction.

### FR-07.7

Nếu có bất kỳ lỗi dữ liệu hoặc CSDL, hệ thống không lưu kết quả dở dang.

### FR-07.8

ADMIN có thể nhập toàn bộ bằng file `.xlsx`.

### FR-07.9

Mọi thao tác tạo/cập nhật dữ liệu OT hoặc tính lại lương phải có lý do riêng cho từng nhân viên, dài từ 10 đến 500 ký tự. Lý do được lưu cùng giá trị lương trước/sau, người thao tác và thời điểm; ADMIN có thể xem lịch sử theo nhân viên và kỳ lương.

---

## FR-08: Nhập OT từ Excel

### FR-08.1

File Excel phải là `.xlsx` và kích thước tối đa 10 MB.

### FR-08.2

Worksheet đầu tiên phải có một trong các nhóm tiêu đề sau:

- `employee_code`, `ot_hours`, `reason`.
- `Mã nhân viên`, `Giờ OT`, `Lý do`.

### FR-08.3

Mỗi mã nhân viên chỉ xuất hiện một lần.

### FR-08.4

File tối đa 10.000 dòng.

### FR-08.5

Mã nhân viên phải tồn tại và có hợp đồng.

### FR-08.6

Backend kiểm tra toàn bộ file trước khi ghi.

### FR-08.7

Mọi dòng trong file được nhập nguyên tử; lỗi ở bất kỳ dòng nào làm rollback toàn bộ.

### FR-08.8

Để đọc và ghi `.xlsx`, môi trường PHP phải có PHP Zip extension.

---

## FR-09: Tính lương

### FR-09.1

Hệ thống tính lương theo công thức tỷ lệ ngày công:

```text
Lương theo công = Lương cơ bản / Số ngày công chuẩn × Số ngày công thực tế
OT = Số giờ OT × (Lương cơ bản / (Số ngày chuẩn × 8)) × Hệ số OT
Gross = Lương theo công + Phụ cấp + OT
BHXH = Lương đóng bảo hiểm × 10.5%
Net = Gross - BHXH - Thuế TNCN
```

### FR-09.2

Hệ suất làm thêm mặc định là 1.5.

### FR-09.3

Hệ thống chỉ tính lại kỳ ở trạng thái `DRAFT`.

### FR-09.4

Mọi nhân viên trong kỳ phải có dữ liệu công/OT và hợp đồng.

### FR-09.5

Tính lương chạy trong transaction cho toàn kỳ.

### FR-09.6

Hệ thống lưu:

- Gross.
- BHXH.
- Giảm trừ gia cảnh.
- Thuế TNCN.
- Net.
- Ngày công.
- Giờ OT.

### FR-09.7

Từ năm 2026:

- Giảm trừ bản thân: 15.500.000 đồng/tháng.
- Giảm trừ mỗi người phụ thuộc: 6.200.000 đồng/tháng.
- Biểu thuế lũy tiến 5 bậc: 5%, 10%, 20%, 30%, 35%.

### FR-09.8

Trước năm 2026:

- Giảm trừ bản thân: 11.000.000 đồng/tháng.
- Giảm trừ mỗi người phụ thuộc: 4.400.000 đồng/tháng.
- Hệ thống vẫn giữ biểu thuế 7 bậc tương ứng trong engine.

### FR-09.9

Phần OT cao hơn tiền lương giờ bình thường được loại khỏi thu nhập tính thuế khi OT có hệ số lớn hơn 1.

### FR-09.10

Toàn bộ phụ cấp cố định hiện được xem là thu nhập chịu thuế do dữ liệu không phân loại khoản phụ cấp miễn thuế.

### FR-09.11

Thuế được tính theo giả định nhân viên là cá nhân cư trú làm việc theo hợp đồng lao động đủ điều kiện.

### FR-09.12

Hệ thống chưa xử lý quyết toán thuế năm, cá nhân không cư trú, hợp đồng ngắn hạn hoặc tổng hợp nhiều nguồn thu nhập.

---

## FR-10: Khóa sổ kỳ lương

### FR-10.1

ADMIN chỉ được khóa kỳ ở trạng thái `DRAFT`.

### FR-10.2

Tất cả nhân viên phải có dữ liệu công/OT, hợp đồng và kết quả lương hợp lệ.

### FR-10.3

Nếu dữ liệu thay đổi sau lần tính, hệ thống yêu cầu tính lại toàn kỳ trước khi khóa.

### FR-10.4

Khóa sổ chạy nguyên tử.

### FR-10.5

Sau khi khóa:

- Không sửa công/OT.
- Không tính lại lương.
- Phiếu lương được công bố cho nhân viên.

---

## FR-11: Tài khoản nhận lương

### FR-11.1

Mỗi nhân viên có thể lưu:

- Tên ngân hàng.
- Chủ tài khoản.
- Số tài khoản.

### FR-11.2

ADMIN cập nhật tài khoản nhận lương.

### FR-11.3

Thông tin tài khoản không được trả trong phản hồi đăng nhập.

---

## FR-12: Xuất danh sách chuyển khoản

### FR-12.1

Hệ thống xuất file `.xlsx` chuyển khoản cho kỳ `LOCKED`.

### FR-12.2

File gồm:

- Mã nhân viên.
- Tên nhân viên.
- Ngân hàng.
- Chủ tài khoản.
- Số tài khoản.
- Số tiền Net.
- Nội dung chuyển khoản.

### FR-12.3

Hệ thống không tạo file nếu còn nhân viên thiếu tài khoản ngân hàng.

### FR-12.4

Phản hồi trả danh sách mã nhân viên thiếu tài khoản để ADMIN xử lý.

---

## FR-13: Phiếu lương điện tử

### FR-13.1

EMPLOYEE xem phiếu lương của chính mình.

### FR-13.2

Phiếu lương chỉ có ở kỳ `LOCKED` hoặc `PAID`.

### FR-13.3

Phiếu hiển thị các cấu phần lương và thuế.

### FR-13.4

EMPLOYEE tải phiếu lương dạng HTML tự chứa để mở, in hoặc lưu thành PDF.

---

## FR-14: Chấm công theo ngày

### FR-14.1

EMPLOYEE xem lịch chấm công theo tháng.

### FR-14.2

Lịch bắt đầu theo Thứ Hai và hiển thị theo 7 cột.

### FR-14.3

Mỗi bản ghi chấm công gồm:

- Ca làm.
- Giờ bắt đầu/kết thúc ca.
- Giờ vào/ra.
- Trạng thái.
- Giờ làm.
- Giờ OT.
- Ghi chú.

### FR-14.4

Trạng thái chấm công gồm:

- `PRESENT`.
- `LATE`.
- `REMOTE`.
- `LEAVE`.
- `ABSENT`.

### FR-14.5

Giao diện thống kê:

- Tổng buổi đi làm.
- Buổi nghỉ.
- Giờ làm.
- Giờ OT.
- Số phút đi muộn.

---

## FR-15: Quản lý nghỉ phép

### FR-15.1

Hệ thống hỗ trợ bốn loại nghỉ:

- `ANNUAL`: phép năm.
- `SICK`: nghỉ ốm.
- `UNPAID`: nghỉ không lương.
- `OTHER`: việc riêng có lương.

### FR-15.2

EMPLOYEE xem quỹ phép năm trong năm hiện tại gồm:

- Tổng quỹ.
- Đã nghỉ.
- Đang chờ.
- Còn lại.

### FR-15.3

Quỹ phép năm cơ bản là 12 ngày.

### FR-15.4

Năm đầu làm việc tính phép theo tỉ lệ số tháng còn lại, tính cả tháng bắt đầu.

### FR-15.5

Thêm 1 ngày phép cho mỗi đủ 5 năm thâm niên.

### FR-15.6

Chỉ ngày làm từ Thứ Hai đến Thứ Sáu được tính trong đơn.

### FR-15.7

Mỗi đơn tối đa 30 ngày làm việc.

### FR-15.8

Đơn không được kéo dài sang năm khác.

### FR-15.9

Mọi loại đơn nghỉ, bao gồm nghỉ ốm, không được bắt đầu trong quá khứ.

### FR-15.10

### FR-15.10

Khoảng thời gian đã có đơn `PENDING` hoặc `APPROVED` không được tạo đơn trùng.

### FR-15.12

Quỹ phép tính cả đơn đang chờ duyệt.

### FR-15.13

EMPLOYEE tạo đơn nghỉ với lý do từ 3–500 ký tự.

### FR-15.14

EMPLOYEE huỷ được đơn đang `PENDING` của chính mình.

### FR-15.15

ADMIN xem tất cả đơn, thống kê và lọc theo trạng thái.

### FR-15.16

ADMIN duyệt hoặc từ chối đơn `PENDING`.

### FR-15.17

Từ chối đơn bắt buộc có lý do từ 3 ký tự trở lên.

### FR-15.18

Duyệt/từ chối đơn được thực hiện trong transaction và chỉ áp dụng cho đơn `PENDING`.

### FR-15.19

Khi đơn được duyệt, hệ thống ghi trạng thái `LEAVE` vào các ngày làm việc tương ứng trong `attendance_records`.

---

## FR-16: Hồ sơ cá nhân

### FR-16.1

EMPLOYEE xem mã nhân viên, email, phòng ban, chức danh, ngày vào làm, hợp đồng và lương.

### FR-16.2

EMPLOYEE xem đồng nghiệp cùng phòng ban.

### FR-16.3

Người dùng đăng nhập có thể cập nhật ảnh đại diện.

### FR-16.4

Ảnh được thu nhỏ trên trình duyệt trước khi gửi.

### FR-16.5

Chỉ cho phép JPEG, PNG và WebP.

### FR-16.6

Ảnh tối đa 400 KB sau khi nén.

### FR-16.7

Người dùng có thể xoá ảnh đại diện.

---

## FR-17: Giao diện tổng quan

### FR-17.1

ADMIN có trang tổng quan nhân sự, phòng ban, hợp đồng và lương.

### FR-17.2

EMPLOYEE có trang tổng quan cá nhân.

### FR-17.3

Biểu đồ lương sử dụng Recharts:

- Thu nhập Gross/Net theo thời gian.
- Quỹ lương theo kỳ.
- Giờ làm và OT theo ngày.
- Ngày công theo kỳ.
- OT theo kỳ.

### FR-17.4

Quỹ lương theo phòng ban hiển thị bằng thanh ngang.

### FR-17.5

Hệ thống hỗ trợ giao diện sáng và tối.

### FR-17.6

Giao diện responsive trên desktop, tablet và mobile.

### FR-17.7

Bảng dữ liệu ẩn cột phụ trên màn hình nhỏ.

### FR-17.8

Giao diện dùng ngôn ngữ thiết kế Apple: nền sáng/tối, xanh dương làm màu nhấn, nút pill và khối tile tối.

---

## 4. API yêu cầu

### 4.1 Chuẩn API

- API trả JSON.
- Giao thức:
  - Query parameter: `/?action=<action>`.
  - RESTful cho một số tài nguyên: `/contracts`, `/contracts/{id}`, `/employees/{id}`.
- Đăng nhập giữ phiên qua cookie `PHPSESSID`.
- Khi gọi API qua Vite, request `/api` được proxy tới backend.
- Khi chạy khác origin, backend kiểm tra `FRONTEND_ORIGIN` và danh sách origin cho phép.

### 4.2 HTTP status

| HTTP | Ý nghĩa |
|---|---|
| 200 | Thành công. |
| 201 | Tạo tài nguyên thành công. |
| 400 | Thiếu dữ liệu bắt buộc hoặc dữ liệu sai kiểu. |
| 401 | Chưa đăng nhập hoặc sai thông tin đăng nhập. |
| 403 | Không có quyền. |
| 404 | Không tìm thấy tài nguyên. |
| 405 | Sai HTTP method. |
| 409 | Xung đột trạng thái nghiệp vụ. |
| 413 | Dữ liệu tải lên quá kích thước. |
| 422 | Dữ liệu hợp lệ cú pháp nhưng vi phạm nghiệp vụ. |
| 500 | Lỗi cơ sở dữ liệu hoặc lỗi máy chủ. |

### 4.3 Danh sách action

| Nhóm | Action | Method | Quyền |
|---|---|---|---|
| Hệ thống | `/` | GET | Không |
| Xác thực | `login` | POST | Không |
| Xác thực | `me` | GET | Đăng nhập |
| Xác thực | `logout` | GET | Đăng nhập |
| Nhân viên | `employee/dashboard` | GET | EMPLOYEE |
| Chấm công | `employee/attendance` | GET | EMPLOYEE |
| Nghỉ phép | `employee/leave` | GET/POST | EMPLOYEE |
| Nghỉ phép | `employee/leave/cancel` | POST | EMPLOYEE |
| Nghỉ phép | `leave/requests` | GET | ADMIN |
| Nghỉ phép | `leave/review` | POST | ADMIN |
| Hồ sơ | `profile/avatar` | POST | Đăng nhập |
| Hợp đồng | `contracts` | GET | ADMIN |
| Hợp đồng | `contracts/show` | GET | ADMIN |
| Hợp đồng | `contracts/update` | PUT | ADMIN |
| Hợp đồng | `contracts/adjustments` | GET/POST | ADMIN |
| Nhân viên | `employees` | GET | ADMIN |
| Nhân viên | `employees/show` | GET | ADMIN |
| Nhân viên | `employees/create` | POST | ADMIN |
| Nhân viên | `employees/update` | PUT | ADMIN |
| Nhân viên | `employees/delete` | DELETE | ADMIN |
| Lương | `payroll/periods` | POST | ADMIN |
| Lương | `payroll/items` | GET | ADMIN |
| Lương | `payroll/attendance` | GET/PUT/POST | ADMIN |
| Lương | `payroll/import` | POST | ADMIN |
| Lương | `payroll/calculate` | POST | ADMIN |
| Lương | `payroll/run` | POST | ADMIN |
| Lương | `payroll/changes` | GET | ADMIN |
| Lương | `payroll/lock` | POST | ADMIN |
| Lương | `payroll/bank-account` | PUT/POST | ADMIN |
| Lương | `payroll/export-bank-transfers` | GET | ADMIN |
| Lương | `payroll/payslip` | GET | EMPLOYEE |
| Lương | `payroll/payslip/download` | GET | EMPLOYEE |

---

## 5. Mô hình dữ liệu

## 5.1 Bảng `users`

Lưu tài khoản và hồ sơ nhân viên:

- `id`.
- `employee_code`.
- `full_name`.
- `email`.
- `password`.
- `role`.
- `department`.
- `position`.
- `status`.
- `joined_at`.
- `avatar`.
- `bank_name`.
- `bank_account_name`.
- `bank_account_number`.
- `created_at`.

## 5.2 Bảng `contracts`

Lưu hợp đồng/hạng mục lương:

- `id`.
- `user_id`.
- `base_salary`.
- `insurance_salary`.
- `dependents_count`.
- `allowance`.
- `created_at`.

## 5.3 Bảng `contract_salary_adjustments`

Lưu lịch sử điều chỉnh lương:

- `contract_id`.
- `effective_month`.
- Các mức lương cũ và mới.
- Số người phụ thuộc cũ và mới.
- `reason`.
- `changed_by`.
- `created_at`.

Mỗi hợp đồng chỉ có một điều chỉnh cho cùng một tháng hiệu lực.

## 5.4 Bảng `payroll_change_logs`

Lưu lịch sử thay đổi bảng lương theo từng nhân viên và kỳ:

- Loại thao tác, lý do, người thực hiện và thời điểm.
- Giá trị trước/sau của ngày công, OT, Gross, bảo hiểm, giảm trừ, thuế và Net.
- Dữ liệu lịch sử không bị xóa khi kỳ lương hoặc nhân viên bị xóa.

Các bản ghi lương cũ không được backfill vì hệ thống không có lý do và trạng thái trước đó để khôi phục.

## 5.5 Bảng `payroll_periods`

- `id`.
- `month_year`.
- `standard_days`.
- `status`: `DRAFT`, `LOCKED`, `PAID`.
- `created_at`.

## 5.6 Bảng `payroll_items`

- `period_id`.
- `user_id`.
- `actual_days`.
- `ot_hours`.
- `gross_salary`.
- `social_insurance`.
- `tax_deduction`.
- `personal_tax`.
- `net_salary`.

Mỗi nhân viên có một dòng lương trong một kỳ.

## 5.6 Bảng `attendance_records`

- `user_id`.
- `work_date`.
- `shift`.
- `shift_start`.
- `shift_end`.
- `check_in`.
- `check_out`.
- `status`.
- `work_hours`.
- `ot_hours`.
- `note`.
- `created_at`.

Mỗi nhân viên chỉ có một bản ghi một ngày.

## 5.7 Bảng `leave_requests`

- `user_id`.
- `type`: `ANNUAL`, `SICK`, `UNPAID`, `OTHER`.
- `start_date`.
- `end_date`.
- `days`.
- `reason`.
- `status`: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`.
- `reviewer_id`.
- `review_note`.
- `reviewed_at`.
- `created_at`.

## 5.8 Quan hệ chính

```text
users 1 ─── n contracts
users 1 ─── n payroll_items
users 1 ─── n attendance_records
users 1 ─── n leave_requests
users 1 ─── n leave_requests (reviewer)

payroll_periods 1 ─── n payroll_items
contracts 1 ─── n contract_salary_adjustments
```

---

## 6. Luồng nghiệp vụ

### UC-01: Quản lý hợp đồng và điều chỉnh lương

1. ADMIN mở trang hợp đồng.
2. Hệ thống tải danh sách hợp đồng.
3. ADMIN chọn nhân viên/hợp đồng.
4. ADMIN nhập mức lương, phụ cấp, người phụ thuộc và lý do.
5. Hệ thống xác thực dữ liệu.
6. Hệ thống tạo điều chỉnh hiệu lực tháng kế tiếp.
7. Hệ thống lưu mức cũ và mới.
8. Hệ thống hiển thị lịch sử điều chỉnh.

Luồng thay thế:

- Không có thay đổi lương: từ chối tạo điều chỉnh.
- Tháng hiệu lực đã có điều chỉnh: từ chối trùng bản ghi.

### UC-02: Nhập công/OT

1. ADMIN chọn kỳ lương.
2. Hệ thống tải danh sách nhân viên.
3. Hệ thống hiển thị ngày công từ chấm công theo ngày; ADMIN nhập OT trên grid hoặc tải file Excel.
4. Hệ thống xác thực dữ liệu.
5. Hệ thống lưu dữ liệu.
6. Hệ thống tính lại dòng lương trong cùng transaction.

Luồng thay thế:

- Kỳ `LOCKED`/`PAID`: từ chối sửa.
- File `.xlsx` sai định dạng: trả lỗi.
- Mã nhân viên không tồn tại hoặc không có hợp đồng: rollback.

### UC-03: Tính bảng lương

1. ADMIN mở kỳ `DRAFT`.
2. Hệ thống kiểm tra mọi nhân viên có công/OT và hợp đồng.
3. Engine tính Gross, bảo hiểm, thuế và Net.
4. Hệ thống lưu kết quả toàn kỳ trong transaction.
5. Giao diện hiển thị tổng Gross/Net.

Luồng thay thế:

- Thiếu dữ liệu: không tính.
- Công/OT âm hoặc quá giới hạn: không tính.
- Lỗi CSDL: rollback toàn bộ.

### UC-04: Khóa và xuất chuyển khoản

1. Hệ thống kiểm tra kỳ đã đầy đủ dữ liệu.
2. Hệ thống xác nhận kết quả khớp công thức.
3. ADMIN khóa kỳ.
4. Hệ thống chuyển trạng thái từ `DRAFT` sang `LOCKED`.
5. ADMIN xuất file chuyển khoản.
6. Hệ thống kiểm tra tài khoản ngân hàng của mọi nhân viên.
7. Hệ thống tạo file `.xlsx`.

Luồng thay thế:

- Dữ liệu công/OT thay đổi: yêu cầu tính lại trước khóa.
- Thiếu tài khoản: không tạo file.

### UC-05: Xem phiếu lương

1. EMPLOYEE đăng nhập.
2. EMPLOYEE mở trang Phiếu lương.
3. Hệ thống chỉ trả kỳ `LOCKED`/`PAID`.
4. EMPLOYEE xem hoặc tải phiếu lương.

### UC-06: Gửi đơn nghỉ phép

1. EMPLOYEE mở trang Nghỉ phép.
2. Hệ thống hiển thị quỹ phép và danh sách đơn.
3. EMPLOYEE chọn loại nghỉ và khoảng thời gian.
4. Hệ thống tính số ngày làm việc.
5. Hệ thống kiểm tra quy tắc và quỹ phép.
6. Hệ thống tạo đơn `PENDING`.

Luồng thay thế:

- Quá 30 ngày làm việc: từ chối.
- Trùng đơn `PENDING`/`APPROVED`: từ chối.
- Vượt quỹ phép: từ chối.
- Khai báo nghỉ ốm quá 30 ngày trước: từ chối.

### UC-07: Duyệt hoặc từ chối nghỉ phép

1. ADMIN mở danh sách nghỉ phép.
2. ADMIN chọn đơn `PENDING`.
3. Nếu duyệt:
   - Hệ thống đổi trạng thái thành `APPROVED`.
   - Hệ thống ghi `LEAVE` vào `attendance_records`.
4. Nếu từ chối:
   - ADMIN nhập lý do.
   - Hệ thống đổi trạng thái thành `REJECTED`.

Luồng thay thế:

- Đơn đã xử lý: từ chối duyệt lần hai.
- Thiếu lý do từ chối: từ chối.

### UC-08: Cập nhật ảnh đại diện

1. EMPLOYEE hoặc ADMIN mở hồ sơ.
2. Người dùng chọn ảnh.
3. Front-End resize và nén ảnh.
4. Front-End gửi Base64.
5. Backend xác thực MIME và kích thước.
6. Backend lưu ảnh vào `users.avatar`.

---

## 7. Yêu cầu phi chức năng

### NFR-01: Hiệu năng

- API đọc danh sách thông thường phải phản hồi trong mục tiêu 2 giây trong môi trường phát triển.
- Tính lương toàn kỳ phải dùng transaction và không ghi dữ liệu dở dang.
- Import Excel giới hạn 10.000 dòng và 10 MB.
- Front-End chia trang thành lazy-loaded chunks để admin và cổng nhân viên không tải mã của nhau.

### NFR-02: Bảo mật

- Mật khẩu lưu bằng Bcrypt.
- Truy vấn CSDL dùng PDO prepared statements.
- Cookie phiên bật `HttpOnly`.
- Hỗ trợ `Secure` và `SameSite=Lax` khi chạy HTTPS.
- Session có `PHPSESSID` và regenerate session sau đăng nhập.
- Không log mật khẩu hoặc dữ liệu ngân hàng.
- API có kiểm tra quyền theo role.
- EMPLOYEE không được truy cập dữ liệu nhân viên khác.
- Không commit `env.php`, `.env`, khoá, chứng chỉ hoặc credentials.

### NFR-03: Tính toàn vẹn dữ liệu

- Sử dụng transaction cho nhập công/OT, chạy bảng lương, khóa sổ và duyệt nghỉ phép.
- Dùng khóa ngoại InnoDB.
- Dùng unique key cho:
  - Một bản ghi công/ngày/người.
  - Một điều chỉnh hợp đồng/tháng.
  - Một dòng lương/kỳ/người theo cấu trúc dữ liệu hiện hành.

### NFR-04: Khả dụng

- Mọi thao tác quan trọng phải hiển thị thông báo thành công hoặc thất bại.
- Khi API lỗi CSDL, backend trả thông báo chung và ghi lỗi vào server log.
- Hệ thống không hiển thị chi tiết kỹ thuật CSDL cho người dùng.

### NFR-05: Tương thích

- Front-End yêu cầu Node.js 22.12 trở lên.
- Back-End yêu cầu PHP 8.1 trở lên.
- Cơ sở dữ liệu yêu cầu MySQL.
- Chạy được trên Windows Laragon/XAMPP và macOS MAMP.
- Trình duyệt hiện đại hỗ trợ React/Vite.

### NFR-06: Khả năng bảo trì

- Back-End tách controller, model, service và router.
- Quy tắc thuần nên đặt trong service để kiểm thử độc lập.
- Front-End tách trang theo route và lazy loading.
- Migration dùng số thứ tự và dữ liệu seed có thể chạy lại.
- Không dùng lock file trong repository để tránh xung đột native package.

### NFR-07: Khả năng kiểm thử

- Hệ thống có kiểm thử Front-End bằng Vitest.
- Hệ thống có kiểm thử thuần PHP không cần CSDL/PHPUnit.
- Kiểm thử nghiệp vụ chụp quy tắc lương, thuế, nghỉ phép và điều chỉnh lương.
- Kiểm thử giao diện chụp đăng nhập, phân quyền, chấm công, nghỉ phép, theme và cổng nhân viên.

### NFR-08: Responsive

- Giao diện hỗ trợ desktop và mobile.
- Bảng thu gọn cột phụ ở màn hình nhỏ.
- Hồ sơ nhân viên không bị lỗi bố cục ở khung hẹp.

### NFR-09: Trải nghiệm người dùng

- Giao diện có chế độ sáng/tối.
- Số liệu tĩnh không có hiệu ứng nhảy số.
- Thanh điều hướng dashboard hỗ trợ chuyển động trượt.
- Giao diện đăng nhập giữ bố cục tối giản.

---

## 8. Yêu cầu dữ liệu và triển khai

### 8.1 Cấu hình Back-End

Tạo `Back-End/configs/env.php` từ `env.example.php`:

- `DB_HOST`.
- `DB_PORT`.
- `DB_NAME`.
- `DB_USERNAME`.
- `DB_PASSWORD`.
- `FRONTEND_ORIGIN`.
- `PATH_*`.

Không commit `env.php`.

### 8.2 Cấu hình Front-End

- Cấu hình `BACKEND_URL` trong `.env` nếu không dùng proxy mặc định.
- Proxy mặc định chuyển API sang `http://localhost:8000`.

### 8.3 Khởi tạo database

Chạy một trong hai cách:

1. Import `QLNS-Database.sql`.
2. Chạy migration theo thứ tự cho database cũ.

Các migration hiện có:

- `001_employee_profile.sql`.
- `002_payroll_period_unique_month.sql`.
- `003_user_bank_accounts.sql`.
- `004_avatar_daily_attendance.sql`.
- `005_leave_requests.sql`.
- `006_contract_salary_adjustments.sql`.
- `007_recalculate_pit_2026.sql`.
- `008_payroll_change_audit.sql`.

### 8.4 Khởi tạo tài khoản mẫu

Chạy:

```bash
php Back-End/database/seed_passwords.php
```

Tài khoản mẫu sử dụng mã nhân viên NV001–NV005 và mật khẩu `123456` sau khi chạy seed.

### 8.5 Chạy ứng dụng

```bash
cd Front-End
npm install
npm run backend
npm run dev
```

Mặc định Front-End tại `http://127.0.0.1:5173`; Back-End tại `http://localhost:8000`.

---

## 9. Kiểm thử và tiêu chí chấp nhận

### 9.1 Kiểm thử Back-End

Chạy:

```bash
cd Front-End
npm run test:backend
```

Tệp kiểm thử: `test-backend.php`.

Phạm vi:

- Quy tắc ngày làm.
- Quỹ phép và thâm niên.
- Nghỉ ốm.
- Việc kéo dài sang năm khác.
- Khoảng 30 ngày làm việc.
- Công thức lương.
- Các mốc thuế.
- Giảm trừ gia cảnh.
- OT miễn thuế.
- Quy tắc kỳ lương.
- Quy tắc điều chỉnh hợp đồng.

Kết quả cổng bộ gần nhất: 60/60 kiểm thử Back-End đạt.

### 9.2 Kiểm thử Front-End

Chạy:

```bash
cd Front-End
npm test
```

Kiểm thử UI bao gồm:

- Chưa đăng nhập chuyển về login.
- Lỗi mật khẩu.
- Đăng nhập ADMIN.
- EMPLOYEE không truy cập trang ADMIN.
- Chấm công và lưu grid.
- Chặn ngày công vượt giới hạn.
- Chuyển theme sáng/tối.
- Định dạng tiền, kỳ lương và chữ viết tắt.
- Điều hướng cổng nhân viên.
- Giao diện nghỉ phép.

### 9.3 Tiêu chí chấp nhận tổng thể

- ADMIN và EMPLOYEE đăng nhập đúng vai trò.
- Không truy cập được dữ liệu sai vai trò.
- Nhân viên mới có thể tạo hợp đồng và dữ liệu lương.
- Kỳ lương chuyển đúng trạng thái `DRAFT -> LOCKED -> PAID`.
- Không sửa được dữ liệu công/OT sau khi khóa.
- Tính lương và Net khớp công thức.
- Excel import rollback khi có dòng lỗi.
- Đơn nghỉ phép tuân thủ quy tắc quỹ phép.
- Đơn duyệt ghi trạng thái chấm công `LEAVE`.
- Phiếu lương không lộ cho nhân viên ở kỳ chưa công bố.
- Tài khoản ngân hàng đủ mới xuất chuyển khoản.
- Build Front-End thành công.
- Back-End kiểm thử 60/60 đạt.

---

## 10. Ràng buộc và ngoài phạm vi

### 10.1 Ràng buộc hiện tại

- Backend không dùng framework PHP.
- Front-End không có offline mode.
- Dữ liệu giao diện phải lấy từ backend.
- Hệ thống chưa có API quản lý phòng ban độc lập; phòng ban lưu trực tiếp trong `users.department`.
- Hợp đồng đang không lưu kiểu hợp đồng, ngày bắt đầu/kết thúc hợp đồng chi tiết.
- Phụ cấp chưa có danh mục miễn thuế/chi tiết từng khoản.
- Chưa hỗ trợ tính mức trần BHXH theo mức lương cơ sở.
- Chưa hỗ trợ quyết toán thuế năm.
- Chưa hỗ trợ cá nhân không cư trú.
- Chưa hỗ trợ xác thực hai yếu tố.
- Chưa hỗ trợ reset mật khẩu qua email.
- Chưa hỗ trợ audit log chung cho mọi thao tác.
- Chưa lưu lịch sử thanh toán bên ngoài trạng thái kỳ lương.

### 10.2 Ngoài phạm vi tài liệu hiện hành

- Tuyển dụng.
- Đánh giá hiệu suất.
- Lương theo sản phẩm.
- Quản lý tài sản.
- Kế toán tổng quát.
- Quản lý bảo hiểm chi tiết.
- Ký hợp đồng điện tử.
- Tích hợp ngân hàng trực tuyến.
- Tích hợp HRM, ERP hoặc e-sign bên ngoài.

---

## 11. Ma trận truy xuất yêu cầu

| Mã yêu cầu | Thành phần/luồng | Kiểm thử/căn cứ |
|---|---|---|
| FR-01, FR-02 | AuthController, use-auth | App.test.jsx |
| FR-03, FR-04 | EmployeeController, pages/admin/employees.jsx | App.test.jsx |
| FR-05 | ContractController, ContractSalaryAdjustmentPolicy | test-backend.php |
| FR-06, FR-10 | PayrollPeriodPolicy, PayrollPeriodService | test-backend.php |
| FR-07, FR-08 | AttendanceService, XlsxAttendanceReader | API và App.test.jsx |
| FR-09 | PayrollEngine, PayrollRunService | test-backend.php |
| FR-12 | PayrollController, XlsxExportWriter | Migration 003 |
| FR-13 | PayrollController, PayslipRenderer | pages/employee/payslips.jsx |
| FR-14 | AttendanceService, EmployeeController | pages/employee/attendance.jsx |
| FR-15 | LeavePolicy, LeaveRequestModel, LeaveController | test-backend.php, App.test.jsx |
| FR-16 | ProfileController, migration 004 | App.test.jsx |
| FR-17 | App.jsx, Tailwind, Recharts, DESIGN.md | App.test.jsx |

---

## 12. Bảo trì tài liệu

Mọi thay đổi về:

- Vai trò.
- API.
- Cơ sở dữ liệu.
- Quy tắc lương.
- Quy tắc nghỉ phép.
- Trạng thái kỳ lương.
- Luồng giao diện.

phải cập nhật tài liệu SRS và tài liệu API liên quan.

Thay đổi quy tắc tính lương phải có kiểm thử biên trước khi triển khai.
