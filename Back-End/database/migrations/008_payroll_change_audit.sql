-- Migration 008: lưu nhật ký thay đổi kết quả lương cùng lý do theo từng nhân viên.
-- Chạy MỘT LẦN trên database `qlns` (phpMyAdmin → chọn qlns → tab SQL → dán → Go).
-- Nếu import mới QLNS-Database.sql đã có bảng này thì KHÔNG cần chạy file này.

USE `qlns`;

CREATE TABLE IF NOT EXISTS `payroll_change_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `period_id` int NOT NULL,
  `user_id` int NOT NULL,
  `changed_by` int DEFAULT NULL,
  `change_type` enum('INITIAL_CALCULATION','INPUT_UPDATE','RECALCULATION') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `previous_actual_days` decimal(8,2) DEFAULT NULL,
  `actual_days` decimal(8,2) NOT NULL,
  `previous_ot_hours` decimal(8,2) DEFAULT NULL,
  `ot_hours` decimal(8,2) NOT NULL,
  `previous_gross_salary` decimal(12,2) DEFAULT NULL,
  `gross_salary` decimal(12,2) NOT NULL,
  `previous_social_insurance` decimal(12,2) DEFAULT NULL,
  `social_insurance` decimal(12,2) NOT NULL,
  `previous_tax_deduction` decimal(12,2) DEFAULT NULL,
  `tax_deduction` decimal(12,2) NOT NULL,
  `previous_personal_tax` decimal(12,2) DEFAULT NULL,
  `personal_tax` decimal(12,2) NOT NULL,
  `previous_net_salary` decimal(12,2) DEFAULT NULL,
  `net_salary` decimal(12,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payroll_change_employee` (`period_id`, `user_id`, `created_at`),
  KEY `idx_payroll_change_actor` (`changed_by`),
  CONSTRAINT `fk_payroll_change_actor` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
