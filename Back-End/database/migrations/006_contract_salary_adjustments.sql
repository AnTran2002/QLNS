-- Migration 006: lưu lịch sử điều chỉnh lương theo tháng hiệu lực.
-- Chạy MỘT LẦN trên database `qlns` (phpMyAdmin → chọn qlns → tab SQL → dán → Go)
-- hoặc dòng lệnh: mysql -u root -p qlns < Back-End/database/migrations/006_contract_salary_adjustments.sql
-- Nếu import mới QLNS-Database.sql đã có bảng này thì KHÔNG cần chạy file này.

USE `qlns`;

CREATE TABLE IF NOT EXISTS `contract_salary_adjustments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `contract_id` int NOT NULL,
  `effective_month` char(7) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Tháng hiệu lực YYYY-MM',
  `previous_base_salary` decimal(12,2) NOT NULL,
  `previous_insurance_salary` decimal(12,2) NOT NULL,
  `previous_allowance` decimal(12,2) NOT NULL,
  `previous_dependents_count` int NOT NULL,
  `base_salary` decimal(12,2) NOT NULL,
  `insurance_salary` decimal(12,2) NOT NULL,
  `allowance` decimal(12,2) NOT NULL,
  `dependents_count` int NOT NULL,
  `reason` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `changed_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_contract_effective_month` (`contract_id`, `effective_month`),
  KEY `idx_salary_adjustment_month` (`effective_month`),
  CONSTRAINT `fk_salary_adjustment_contract` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_salary_adjustment_actor` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
