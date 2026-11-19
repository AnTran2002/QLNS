-- Thông tin tài khoản nhận lương dùng cho file chuyển khoản UC-04.
ALTER TABLE `users`
  ADD COLUMN `bank_name` varchar(100) DEFAULT NULL AFTER `joined_at`,
  ADD COLUMN `bank_account_name` varchar(100) DEFAULT NULL AFTER `bank_name`,
  ADD COLUMN `bank_account_number` varchar(34) DEFAULT NULL AFTER `bank_account_name`;
