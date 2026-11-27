-- Migration 009: PeopleOS — tuyển dụng, hồ sơ hợp đồng (đọc từ file), phiếu lương chi tiết, hướng dẫn lần đầu.
-- Chạy MỘT LẦN trên database `qlns` (phpMyAdmin → chọn qlns → tab SQL → dán → Go).

USE `qlns`;

-- ===== Chi nhánh (vùng lương tối thiểu theo NĐ 293/2025) =====
CREATE TABLE IF NOT EXISTS `branches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `region` enum('I','II','III','IV') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'I' COMMENT 'Vùng lương tối thiểu',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_branch_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `branches` (`code`, `name`, `address`, `city`, `region`) VALUES
  ('HN',  'Chi nhánh Hà Nội',     'Tầng 12, 54 Liễu Giai, Ba Đình',          'Hà Nội',         'I'),
  ('HCM', 'Chi nhánh TP.HCM',     'Tầng 8, 2 Hải Triều, Bến Nghé, Quận 1',   'TP. Hồ Chí Minh', 'I'),
  ('DN',  'Chi nhánh Đà Nẵng',    '255 Nguyễn Văn Linh, Thanh Khê',          'Đà Nẵng',        'I'),
  ('HP',  'Chi nhánh Hải Phòng',  '15 Lê Hồng Phong, Ngô Quyền',             'Hải Phòng',      'I'),
  ('CT',  'Chi nhánh Cần Thơ',    '209 Đường 30/4, Ninh Kiều',               'Cần Thơ',        'II');

-- ===== Phòng ban (thay cho danh sách gợi ý cứng ở Front-End) =====
CREATE TABLE IF NOT EXISTS `departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_department_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `departments` (`name`)
SELECT DISTINCT `department` FROM `users` WHERE `department` IS NOT NULL AND `department` <> '';
INSERT IGNORE INTO `departments` (`name`) VALUES
  ('Nhân sự'), ('Kỹ thuật'), ('Thiết kế'), ('Kinh doanh'), ('Kế toán'), ('Marketing'), ('Vận hành');

-- ===== Ngày lễ, Tết hưởng nguyên lương (Điều 112 BLLĐ 2019) =====
CREATE TABLE IF NOT EXISTS `public_holidays` (
  `holiday_date` date NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`holiday_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `public_holidays` (`holiday_date`, `name`) VALUES
  ('2026-01-01', 'Tết Dương lịch'),
  ('2026-02-16', 'Tết Nguyên đán'),
  ('2026-02-17', 'Tết Nguyên đán'),
  ('2026-02-18', 'Tết Nguyên đán'),
  ('2026-02-19', 'Tết Nguyên đán'),
  ('2026-02-20', 'Tết Nguyên đán'),
  ('2026-04-27', 'Giỗ Tổ Hùng Vương (nghỉ bù)'),
  ('2026-04-30', 'Ngày Chiến thắng'),
  ('2026-05-01', 'Quốc tế Lao động'),
  ('2026-09-01', 'Quốc khánh'),
  ('2026-09-02', 'Quốc khánh');

-- ===== Hồ sơ nhân viên: thông tin pháp lý lấy từ hợp đồng =====
ALTER TABLE `users`
  ADD COLUMN `branch_id` int DEFAULT NULL AFTER `position`,
  ADD COLUMN `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `email`,
  ADD COLUMN `date_of_birth` date DEFAULT NULL AFTER `phone`,
  ADD COLUMN `gender` enum('Nam','Nữ','Khác') COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `date_of_birth`,
  ADD COLUMN `national_id` varchar(12) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `gender`,
  ADD COLUMN `national_id_issued_date` date DEFAULT NULL AFTER `national_id`,
  ADD COLUMN `national_id_issued_place` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `national_id_issued_date`,
  ADD COLUMN `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `national_id_issued_place`,
  ADD COLUMN `tax_code` varchar(13) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `address`,
  ADD COLUMN `tutorial_completed_at` datetime DEFAULT NULL,
  ADD UNIQUE KEY `uniq_users_national_id` (`national_id`),
  ADD KEY `idx_users_branch` (`branch_id`),
  ADD CONSTRAINT `fk_users_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL;

-- Tài khoản hiện có coi như đã xem hướng dẫn; chỉ tài khoản mới tạo mới thấy tour.
UPDATE `users` SET `tutorial_completed_at` = NOW() WHERE `tutorial_completed_at` IS NULL;

-- ===== Hồ sơ tuyển dụng =====
CREATE TABLE IF NOT EXISTS `job_applications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_of_birth` date NOT NULL,
  `gender` enum('Nam','Nữ','Khác') COLLATE utf8mb4_unicode_ci NOT NULL,
  `national_id` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` int NOT NULL,
  `department` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `education` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `experience_years` decimal(4,1) NOT NULL DEFAULT 0,
  `expected_salary` decimal(12,2) NOT NULL,
  `available_from` date NOT NULL,
  `introduction` text COLLATE utf8mb4_unicode_ci,
  `agreed_terms_at` datetime NOT NULL,
  `status` enum('PENDING','APPROVED','REJECTED','CONTRACT_SUBMITTED','HIRED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `review_note` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `offer_base_salary` decimal(12,2) DEFAULT NULL,
  `offer_allowance` decimal(12,2) DEFAULT NULL,
  `offer_start_date` date DEFAULT NULL,
  `offer_contract_type` enum('INDEFINITE','FIXED_TERM') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `offer_probation_days` int DEFAULT NULL,
  `contract_token` char(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `token_expires_at` datetime DEFAULT NULL,
  `email_sent_at` datetime DEFAULT NULL,
  `hired_user_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_application_token` (`contract_token`),
  KEY `idx_application_status` (`status`, `created_at`),
  KEY `idx_application_email` (`email`),
  KEY `fk_application_branch` (`branch_id`),
  CONSTRAINT `fk_application_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_application_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_application_hired_user` FOREIGN KEY (`hired_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Hồ sơ hợp đồng tải lên (file .docx đã điền + bản scan có chữ ký) =====
CREATE TABLE IF NOT EXISTS `contract_documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `application_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL COMMENT 'Tài khoản được tạo sau khi nhân sự duyệt',
  `contract_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source` enum('APPLICANT','HR') COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stored_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scan_filename` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `scan_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `extracted_data` longtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'JSON các trường đọc được từ hợp đồng',
  `validation` longtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'JSON lỗi/cảnh báo theo BLLĐ 2019',
  `status` enum('PENDING_REVIEW','REJECTED','APPROVED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING_REVIEW',
  `uploaded_by` int DEFAULT NULL,
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `review_note` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_contract_doc_status` (`status`, `created_at`),
  KEY `idx_contract_doc_hash` (`file_hash`),
  CONSTRAINT `fk_contract_doc_application` FOREIGN KEY (`application_id`) REFERENCES `job_applications` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_contract_doc_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_contract_doc_uploader` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_contract_doc_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Hợp đồng: các điều khoản bắt buộc theo Điều 21 BLLĐ 2019 =====
ALTER TABLE `contracts`
  ADD COLUMN `contract_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `user_id`,
  ADD COLUMN `contract_type` enum('INDEFINITE','FIXED_TERM') COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `contract_number`,
  ADD COLUMN `start_date` date DEFAULT NULL AFTER `contract_type`,
  ADD COLUMN `end_date` date DEFAULT NULL AFTER `start_date`,
  ADD COLUMN `probation_days` int NOT NULL DEFAULT 0 AFTER `end_date`,
  ADD COLUMN `probation_salary_rate` decimal(4,3) NOT NULL DEFAULT 1.000 AFTER `probation_days`,
  ADD COLUMN `job_title` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `probation_salary_rate`,
  ADD COLUMN `branch_id` int DEFAULT NULL AFTER `job_title`,
  ADD COLUMN `working_hours_per_day` decimal(4,1) DEFAULT NULL AFTER `branch_id`,
  ADD COLUMN `working_days_per_week` decimal(3,1) DEFAULT NULL AFTER `working_hours_per_day`,
  ADD COLUMN `annual_leave_days` int DEFAULT NULL AFTER `working_days_per_week`,
  ADD COLUMN `payment_method` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `allowance`,
  ADD COLUMN `pay_day` tinyint DEFAULT NULL AFTER `payment_method`,
  ADD COLUMN `commitments` text COLLATE utf8mb4_unicode_ci AFTER `pay_day`,
  ADD COLUMN `signed_date` date DEFAULT NULL AFTER `commitments`,
  ADD COLUMN `document_id` int DEFAULT NULL AFTER `signed_date`,
  ADD UNIQUE KEY `uniq_contract_number` (`contract_number`),
  ADD CONSTRAINT `fk_contracts_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_contracts_document` FOREIGN KEY (`document_id`) REFERENCES `contract_documents` (`id`) ON DELETE SET NULL;

-- ===== Phiếu lương: lưu toàn bộ diễn giải từng khoản =====
ALTER TABLE `payroll_items`
  ADD COLUMN `breakdown` longtext COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'JSON diễn giải chi tiết từng khoản lương';
