-- Migration 001: bổ sung thông tin hồ sơ nhân viên mà Front-End cần hiển thị.
-- Chạy MỘT LẦN trên database `qlns` đã import trước đó (phpMyAdmin → chọn qlns → tab SQL → dán → Go).
-- Nếu import mới QLNS-Database.sql thì KHÔNG cần chạy file này (đã có sẵn các cột).

USE `qlns`;

ALTER TABLE `users`
  ADD COLUMN `department` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Kỹ thuật' COMMENT 'Phòng ban' AFTER `role`,
  ADD COLUMN `position` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'Chức danh' AFTER `department`,
  ADD COLUMN `status` enum('Đang làm việc','Thử việc','Nghỉ phép') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Đang làm việc' COMMENT 'Trạng thái làm việc' AFTER `position`,
  ADD COLUMN `joined_at` date DEFAULT NULL COMMENT 'Ngày gia nhập' AFTER `status`;

-- Mỗi nhân viên chỉ có 1 dòng lương trong 1 kỳ (cần cho INSERT ... ON DUPLICATE KEY UPDATE của PayrollModel).
ALTER TABLE `payroll_items`
  ADD UNIQUE KEY `uniq_period_user` (`period_id`, `user_id`);

-- Gán dữ liệu cho 5 tài khoản mẫu
UPDATE `users` SET `department` = 'Nhân sự',   `position` = 'Giám đốc nhân sự',      `joined_at` = '2026-01-01' WHERE `employee_code` = 'NV001';
UPDATE `users` SET `department` = 'Thiết kế',  `position` = 'Senior UI/UX Designer', `joined_at` = '2026-01-02' WHERE `employee_code` = 'NV002';
UPDATE `users` SET `department` = 'Kỹ thuật',  `position` = 'Backend Developer',     `joined_at` = '2026-01-03' WHERE `employee_code` = 'NV003';
UPDATE `users` SET `department` = 'Kỹ thuật',  `position` = 'Frontend Developer',    `joined_at` = '2026-01-04' WHERE `employee_code` = 'NV004';
UPDATE `users` SET `department` = 'Kinh doanh', `position` = 'Sales Executive',      `joined_at` = '2026-01-05', `status` = 'Thử việc' WHERE `employee_code` = 'NV005';
UPDATE `users` SET `joined_at` = DATE(`created_at`) WHERE `joined_at` IS NULL;
