-- Migration 010: bỏ chức năng tuyển dụng (trang ứng tuyển công khai, duyệt hồ sơ, link hợp đồng cho ứng viên).
-- Tài khoản nhân viên vẫn chỉ được tạo khi nhân sự tải lên và duyệt hồ sơ hợp đồng (bảng contract_documents).
-- Chạy MỘT LẦN trên database đã chạy migration 009 (phpMyAdmin → chọn qlns → tab SQL → dán → Go).
-- LƯU Ý: xoá vĩnh viễn toàn bộ hồ sơ ứng tuyển trong bảng job_applications.

USE `qlns`;

ALTER TABLE `contract_documents`
  DROP FOREIGN KEY `fk_contract_doc_application`,
  DROP COLUMN `application_id`;

UPDATE `contract_documents` SET `source` = 'HR' WHERE `source` <> 'HR';
ALTER TABLE `contract_documents`
  MODIFY `source` enum('HR') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'HR';

DROP TABLE IF EXISTS `job_applications`;
