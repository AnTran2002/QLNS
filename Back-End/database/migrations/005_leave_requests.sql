-- Migration 005: đơn nghỉ phép (nhân viên gửi → quản trị duyệt).
-- Chạy MỘT LẦN trên database `qlns` (phpMyAdmin → chọn qlns → tab SQL → dán → Go)
-- hoặc dòng lệnh: mysql -u root -p qlns < Back-End/database/migrations/005_leave_requests.sql
-- Nếu import mới QLNS-Database.sql thì KHÔNG cần chạy file này (đã có sẵn).
--
-- Quy tắc nghiệp vụ (Back-End/services/LeavePolicy.php):
--   · Phép năm 12 ngày (Điều 113 Bộ luật Lao động 2019), +1 ngày mỗi đủ 5 năm làm việc (Điều 114);
--     năm đầu tính theo tỉ lệ số tháng làm việc.
--   · Chỉ tính ngày làm việc T2–T6; đơn trùng ngày với đơn khác (chờ duyệt / đã duyệt) bị từ chối.
--   · Đơn được duyệt ghi trạng thái LEAVE vào attendance_records (lịch chấm công tháng).

USE `qlns`;

CREATE TABLE IF NOT EXISTS `leave_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` enum('ANNUAL','SICK','UNPAID','OTHER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ANNUAL'
    COMMENT 'ANNUAL nghỉ hằng năm · SICK nghỉ ốm đau theo Luật BHXH · UNPAID nghỉ không lương · OTHER việc riêng hưởng lương theo Điều 115 BLLĐ 2019',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `days` decimal(4,1) NOT NULL COMMENT 'Số ngày làm việc (T2–T6) trong khoảng',
  `reason` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('PENDING','APPROVED','REJECTED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `reviewer_id` int DEFAULT NULL,
  `review_note` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_leave_user_status` (`user_id`, `status`),
  KEY `idx_leave_status` (`status`, `start_date`),
  CONSTRAINT `fk_leave_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_leave_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dữ liệu mẫu: mỗi nhân viên (EMPLOYEE) có 1 đơn phép năm đang chờ duyệt (07–08/12/2026).
-- Chạy lại không tạo trùng (chỉ chèn khi người đó chưa có đơn nào).
INSERT INTO `leave_requests` (`user_id`, `type`, `start_date`, `end_date`, `days`, `reason`)
SELECT u.id, 'ANNUAL', '2026-12-07', '2026-12-08', 2, 'Về quê giải quyết việc gia đình'
FROM `users` u
WHERE u.role = 'EMPLOYEE'
  AND NOT EXISTS (SELECT 1 FROM `leave_requests` l WHERE l.user_id = u.id);
