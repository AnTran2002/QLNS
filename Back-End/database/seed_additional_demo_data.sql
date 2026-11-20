-- Bo sung 5 nhan vien demo vao database QLNS hien tai.
-- Yeu cau da chay cac migration 001_employee_profile.sql,
-- 002_payroll_period_unique_month.sql va 003_user_bank_accounts.sql.
-- Du lieu duoc lien ket bang employee_code va month_year, khong hard-code ID.
-- Co the chay lai: cac INSERT deu bo qua ban ghi da ton tai va khong xoa du lieu.
-- Tai khoan ngan hang bat dau bang 000 la du lieu gia, khong dung thanh toan that.
-- Mat khau cac tai khoan NV006-NV010: 123456.

USE `qlns`;
SET NAMES utf8mb4;
START TRANSACTION;

-- Tao ky neu chua co; neu da co thi giu nguyen status va so ngay cong.
INSERT IGNORE INTO `payroll_periods` (`month_year`, `standard_days`, `status`) VALUES
  ('2026-10', 22, 'PAID'),
  ('2026-11', 22, 'DRAFT');

-- Ho so nhan vien; khong ghi de tai khoan trung ma hoac email.
INSERT IGNORE INTO `users`
  (`employee_code`, `full_name`, `email`, `password`, `role`, `department`, `position`,
   `status`, `joined_at`, `bank_name`, `bank_account_name`, `bank_account_number`)
VALUES
  ('NV006', 'Nguyễn Ngọc Lan', 'lan.nguyen@company.vn', '$2y$10$WDXNiAoLGP1XcDr1pAbUyeP2RKJCYkShTzRYS6Dr4DAZ2T/8OI2tO',
   'EMPLOYEE', 'Kế toán', 'Kế toán tổng hợp', 'Đang làm việc', '2026-02-01', 'DEMO VCB', 'NGUYEN NGOC LAN', '000000000006'),
  ('NV007', 'Võ Quốc Quân', 'quan.vo@company.vn', '$2y$10$WDXNiAoLGP1XcDr1pAbUyeP2RKJCYkShTzRYS6Dr4DAZ2T/8OI2tO',
   'EMPLOYEE', 'Kỹ thuật', 'QA Engineer', 'Thử việc', '2026-03-01', 'DEMO BIDV', 'VO QUOC QUAN', '000000000007'),
  ('NV008', 'Phạm Thu Mai', 'mai.pham@company.vn', '$2y$10$WDXNiAoLGP1XcDr1pAbUyeP2RKJCYkShTzRYS6Dr4DAZ2T/8OI2tO',
   'EMPLOYEE', 'Nhân sự', 'Chuyên viên tuyển dụng', 'Đang làm việc', '2026-04-01', 'DEMO VietinBank', 'PHAM THU MAI', '000000000008'),
  ('NV009', 'Đỗ Anh Tuấn', 'tuan.do@company.vn', '$2y$10$WDXNiAoLGP1XcDr1pAbUyeP2RKJCYkShTzRYS6Dr4DAZ2T/8OI2tO',
   'EMPLOYEE', 'Kinh doanh', 'Chuyên viên kinh doanh', 'Nghỉ phép', '2026-05-01', 'DEMO MB Bank', 'DO ANH TUAN', '000000000009'),
  ('NV010', 'Bùi Thảo Linh', 'linh.bui@company.vn', '$2y$10$WDXNiAoLGP1XcDr1pAbUyeP2RKJCYkShTzRYS6Dr4DAZ2T/8OI2tO',
   'EMPLOYEE', 'Thiết kế', 'Graphic Designer', 'Đang làm việc', '2026-06-01', 'DEMO Agribank', 'BUI THAO LINH', '000000000010');

-- Hop dong; chi them khi dung tai khoan demo va chua co hop dong nao.
INSERT INTO `contracts`
  (`user_id`, `base_salary`, `insurance_salary`, `dependents_count`, `allowance`, `created_at`)
SELECT u.`id`, 21000000, 18000000, 1, 1800000, '2026-02-01 09:00:00'
FROM `users` u
WHERE u.`employee_code` = 'NV006'
  AND u.`full_name` = 'Nguyễn Ngọc Lan'
  AND u.`email` = 'lan.nguyen@company.vn'
  AND NOT EXISTS (SELECT 1 FROM `contracts` c WHERE c.`user_id` = u.`id`);

INSERT INTO `contracts`
  (`user_id`, `base_salary`, `insurance_salary`, `dependents_count`, `allowance`, `created_at`)
SELECT u.`id`, 12500000, 10000000, 0, 1000000, '2026-03-01 09:00:00'
FROM `users` u
WHERE u.`employee_code` = 'NV007'
  AND u.`full_name` = 'Võ Quốc Quân'
  AND u.`email` = 'quan.vo@company.vn'
  AND NOT EXISTS (SELECT 1 FROM `contracts` c WHERE c.`user_id` = u.`id`);

INSERT INTO `contracts`
  (`user_id`, `base_salary`, `insurance_salary`, `dependents_count`, `allowance`, `created_at`)
SELECT u.`id`, 19000000, 16000000, 2, 2200000, '2026-04-01 09:00:00'
FROM `users` u
WHERE u.`employee_code` = 'NV008'
  AND u.`full_name` = 'Phạm Thu Mai'
  AND u.`email` = 'mai.pham@company.vn'
  AND NOT EXISTS (SELECT 1 FROM `contracts` c WHERE c.`user_id` = u.`id`);

INSERT INTO `contracts`
  (`user_id`, `base_salary`, `insurance_salary`, `dependents_count`, `allowance`, `created_at`)
SELECT u.`id`, 24000000, 20000000, 0, 3500000, '2026-05-01 09:00:00'
FROM `users` u
WHERE u.`employee_code` = 'NV009'
  AND u.`full_name` = 'Đỗ Anh Tuấn'
  AND u.`email` = 'tuan.do@company.vn'
  AND NOT EXISTS (SELECT 1 FROM `contracts` c WHERE c.`user_id` = u.`id`);

INSERT INTO `contracts`
  (`user_id`, `base_salary`, `insurance_salary`, `dependents_count`, `allowance`, `created_at`)
SELECT u.`id`, 15500000, 13000000, 1, 1500000, '2026-06-01 09:00:00'
FROM `users` u
WHERE u.`employee_code` = 'NV010'
  AND u.`full_name` = 'Bùi Thảo Linh'
  AND u.`email` = 'linh.bui@company.vn'
  AND NOT EXISTS (SELECT 1 FROM `contracts` c WHERE c.`user_id` = u.`id`);

-- Cong va ket qua luong duoc tinh bang PayrollEngine:
-- gross = luong co ban theo ngay cong + phu cap + OT (1.5x);
-- BHXH = luong dong bao hiem * 10.5%; thue TNCN theo 7 bac.
-- Cac so tien duoi day duoc tinh tu hop dong va ngay cong cua tung nhan vien.
INSERT IGNORE INTO `payroll_items`
  (`period_id`, `user_id`, `actual_days`, `ot_hours`, `gross_salary`,
   `social_insurance`, `tax_deduction`, `personal_tax`, `net_salary`)
SELECT p.`id`, u.`id`, 22, 5, 23694886.36, 1890000.00, 15400000.00, 390488.64, 21414397.73
FROM `payroll_periods` p
JOIN `users` u ON u.`employee_code` = 'NV006'
JOIN `contracts` c ON c.`user_id` = u.`id`
WHERE p.`month_year` = '2026-10' AND p.`status` = 'PAID'
  AND u.`full_name` = 'Nguyễn Ngọc Lan' AND u.`email` = 'lan.nguyen@company.vn'
  AND c.`base_salary` = 21000000 AND c.`insurance_salary` = 18000000
  AND c.`allowance` = 1800000 AND c.`dependents_count` = 1;

INSERT IGNORE INTO `payroll_items`
  (`period_id`, `user_id`, `actual_days`, `ot_hours`, `gross_salary`,
   `social_insurance`, `tax_deduction`, `personal_tax`, `net_salary`)
SELECT p.`id`, u.`id`, 19, 2, 12008522.73, 1050000.00, 11000000.00, 0.00, 10958522.73
FROM `payroll_periods` p
JOIN `users` u ON u.`employee_code` = 'NV007'
JOIN `contracts` c ON c.`user_id` = u.`id`
WHERE p.`month_year` = '2026-10' AND p.`status` = 'PAID'
  AND u.`full_name` = 'Võ Quốc Quân' AND u.`email` = 'quan.vo@company.vn'
  AND c.`base_salary` = 12500000 AND c.`insurance_salary` = 10000000
  AND c.`allowance` = 1000000 AND c.`dependents_count` = 0;

INSERT IGNORE INTO `payroll_items`
  (`period_id`, `user_id`, `actual_days`, `ot_hours`, `gross_salary`,
   `social_insurance`, `tax_deduction`, `personal_tax`, `net_salary`)
SELECT p.`id`, u.`id`, 21, 6, 21307954.55, 1680000.00, 19800000.00, 0.00, 19627954.55
FROM `payroll_periods` p
JOIN `users` u ON u.`employee_code` = 'NV008'
JOIN `contracts` c ON c.`user_id` = u.`id`
WHERE p.`month_year` = '2026-10' AND p.`status` = 'PAID'
  AND u.`full_name` = 'Phạm Thu Mai' AND u.`email` = 'mai.pham@company.vn'
  AND c.`base_salary` = 19000000 AND c.`insurance_salary` = 16000000
  AND c.`allowance` = 2200000 AND c.`dependents_count` = 2;

INSERT IGNORE INTO `payroll_items`
  (`period_id`, `user_id`, `actual_days`, `ot_hours`, `gross_salary`,
   `social_insurance`, `tax_deduction`, `personal_tax`, `net_salary`)
SELECT p.`id`, u.`id`, 17, 0, 22045454.55, 2100000.00, 11000000.00, 644545.45, 19300909.09
FROM `payroll_periods` p
JOIN `users` u ON u.`employee_code` = 'NV009'
JOIN `contracts` c ON c.`user_id` = u.`id`
WHERE p.`month_year` = '2026-10' AND p.`status` = 'PAID'
  AND u.`full_name` = 'Đỗ Anh Tuấn' AND u.`email` = 'tuan.do@company.vn'
  AND c.`base_salary` = 24000000 AND c.`insurance_salary` = 20000000
  AND c.`allowance` = 3500000 AND c.`dependents_count` = 0;

INSERT IGNORE INTO `payroll_items`
  (`period_id`, `user_id`, `actual_days`, `ot_hours`, `gross_salary`,
   `social_insurance`, `tax_deduction`, `personal_tax`, `net_salary`)
SELECT p.`id`, u.`id`, 22, 3, 17396306.82, 1365000.00, 15400000.00, 31565.34, 15999741.48
FROM `payroll_periods` p
JOIN `users` u ON u.`employee_code` = 'NV010'
JOIN `contracts` c ON c.`user_id` = u.`id`
WHERE p.`month_year` = '2026-10' AND p.`status` = 'PAID'
  AND u.`full_name` = 'Bùi Thảo Linh' AND u.`email` = 'linh.bui@company.vn'
  AND c.`base_salary` = 15500000 AND c.`insurance_salary` = 13000000
  AND c.`allowance` = 1500000 AND c.`dependents_count` = 1;

INSERT IGNORE INTO `payroll_items`
  (`period_id`, `user_id`, `actual_days`, `ot_hours`, `gross_salary`,
   `social_insurance`, `tax_deduction`, `personal_tax`, `net_salary`)
SELECT p.`id`, u.`id`, 21, 4, 22561363.64, 1890000.00, 15400000.00, 277136.36, 20394227.27
FROM `payroll_periods` p
JOIN `users` u ON u.`employee_code` = 'NV006'
JOIN `contracts` c ON c.`user_id` = u.`id`
WHERE p.`month_year` = '2026-11' AND p.`status` = 'DRAFT'
  AND u.`full_name` = 'Nguyễn Ngọc Lan' AND u.`email` = 'lan.nguyen@company.vn'
  AND c.`base_salary` = 21000000 AND c.`insurance_salary` = 18000000
  AND c.`allowance` = 1800000 AND c.`dependents_count` = 1;

INSERT IGNORE INTO `payroll_items`
  (`period_id`, `user_id`, `actual_days`, `ot_hours`, `gross_salary`,
   `social_insurance`, `tax_deduction`, `personal_tax`, `net_salary`)
SELECT p.`id`, u.`id`, 20, 3, 12683238.64, 1050000.00, 11000000.00, 31661.93, 11601576.70
FROM `payroll_periods` p
JOIN `users` u ON u.`employee_code` = 'NV007'
JOIN `contracts` c ON c.`user_id` = u.`id`
WHERE p.`month_year` = '2026-11' AND p.`status` = 'DRAFT'
  AND u.`full_name` = 'Võ Quốc Quân' AND u.`email` = 'quan.vo@company.vn'
  AND c.`base_salary` = 12500000 AND c.`insurance_salary` = 10000000
  AND c.`allowance` = 1000000 AND c.`dependents_count` = 0;

INSERT IGNORE INTO `payroll_items`
  (`period_id`, `user_id`, `actual_days`, `ot_hours`, `gross_salary`,
   `social_insurance`, `tax_deduction`, `personal_tax`, `net_salary`)
SELECT p.`id`, u.`id`, 22, 2, 21523863.64, 1680000.00, 19800000.00, 2193.18, 19841670.45
FROM `payroll_periods` p
JOIN `users` u ON u.`employee_code` = 'NV008'
JOIN `contracts` c ON c.`user_id` = u.`id`
WHERE p.`month_year` = '2026-11' AND p.`status` = 'DRAFT'
  AND u.`full_name` = 'Phạm Thu Mai' AND u.`email` = 'mai.pham@company.vn'
  AND c.`base_salary` = 19000000 AND c.`insurance_salary` = 16000000
  AND c.`allowance` = 2200000 AND c.`dependents_count` = 2;

INSERT IGNORE INTO `payroll_items`
  (`period_id`, `user_id`, `actual_days`, `ot_hours`, `gross_salary`,
   `social_insurance`, `tax_deduction`, `personal_tax`, `net_salary`)
SELECT p.`id`, u.`id`, 16, 0, 20954545.45, 2100000.00, 11000000.00, 535454.55, 18319090.91
FROM `payroll_periods` p
JOIN `users` u ON u.`employee_code` = 'NV009'
JOIN `contracts` c ON c.`user_id` = u.`id`
WHERE p.`month_year` = '2026-11' AND p.`status` = 'DRAFT'
  AND u.`full_name` = 'Đỗ Anh Tuấn' AND u.`email` = 'tuan.do@company.vn'
  AND c.`base_salary` = 24000000 AND c.`insurance_salary` = 20000000
  AND c.`allowance` = 3500000 AND c.`dependents_count` = 0;

INSERT IGNORE INTO `payroll_items`
  (`period_id`, `user_id`, `actual_days`, `ot_hours`, `gross_salary`,
   `social_insurance`, `tax_deduction`, `personal_tax`, `net_salary`)
SELECT p.`id`, u.`id`, 19, 5, 15546875.00, 1365000.00, 15400000.00, 0.00, 14181875.00
FROM `payroll_periods` p
JOIN `users` u ON u.`employee_code` = 'NV010'
JOIN `contracts` c ON c.`user_id` = u.`id`
WHERE p.`month_year` = '2026-11' AND p.`status` = 'DRAFT'
  AND u.`full_name` = 'Bùi Thảo Linh' AND u.`email` = 'linh.bui@company.vn'
  AND c.`base_salary` = 15500000 AND c.`insurance_salary` = 13000000
  AND c.`allowance` = 1500000 AND c.`dependents_count` = 1;

COMMIT;
