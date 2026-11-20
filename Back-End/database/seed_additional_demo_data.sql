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


-- ------------------------------------------------------------------
-- Lich su luong thang 1 -> 9/2026 (da tra) cho toan bo NV001-NV010, tinh tu thang vao lam.
-- Muc luong tang dan moi thang (80% -> 96% hop dong hien tai, thang 10 = 100%), OT tang dan;
-- so tien tinh bang PayrollEngine::calculateNetSalary. Chay lai an toan (INSERT IGNORE + uniq_period_user).
-- ------------------------------------------------------------------
-- NOT EXISTS: van dung khi database chua chay migration 002 (unique month_year).
INSERT INTO `payroll_periods` (`month_year`, `standard_days`, `status`, `created_at`)
SELECT v.`month_year`, v.`standard_days`, 'PAID', CONCAT(v.`month_year`, '-01 09:00:00')
FROM (
  SELECT '2026-01' AS `month_year`, 22 AS `standard_days`
  UNION ALL SELECT '2026-02', 20
  UNION ALL SELECT '2026-03', 22
  UNION ALL SELECT '2026-04', 22
  UNION ALL SELECT '2026-05', 21
  UNION ALL SELECT '2026-06', 22
  UNION ALL SELECT '2026-07', 23
  UNION ALL SELECT '2026-08', 21
  UNION ALL SELECT '2026-09', 22
) v
WHERE NOT EXISTS (SELECT 1 FROM `payroll_periods` p WHERE p.`month_year` = v.`month_year`);

INSERT IGNORE INTO `payroll_items`
  (`period_id`, `user_id`, `actual_days`, `ot_hours`, `gross_salary`,
   `social_insurance`, `tax_deduction`, `personal_tax`, `net_salary`)
SELECT p.`id`, u.`id`, v.`actual_days`, v.`ot_hours`, v.`gross_salary`, v.`social_insurance`, v.`tax_deduction`, v.`personal_tax`, v.`net_salary`
FROM (
  SELECT 'NV001' AS `code`, '2026-01' AS `month_year`, 22 AS `actual_days`, 0 AS `ot_hours`, 22400000.00 AS `gross_salary`, 1680000.00 AS `social_insurance`, 15400000.00 AS `tax_deduction`, 282000.00 AS `personal_tax`, 20438000.00 AS `net_salary`
  UNION ALL SELECT 'NV002', '2026-01', 21, 1, 16253409.09, 1260000.00, 15400000.00, 0.00, 14993409.09
  UNION ALL SELECT 'NV003', '2026-01', 20, 1, 14813636.36, 1260000.00, 19800000.00, 0.00, 13553636.36
  UNION ALL SELECT 'NV004', '2026-01', 20, 0, 12836363.64, 1092000.00, 15400000.00, 0.00, 11744363.64
  UNION ALL SELECT 'NV005', '2026-01', 20, 0, 10981818.18, 924000.00, 11000000.00, 0.00, 10057818.18
  UNION ALL SELECT 'NV001', '2026-02', 20, 1, 23192187.50, 1722000.00, 15400000.00, 357018.75, 21113168.75
  UNION ALL SELECT 'NV002', '2026-02', 20, 2, 17585000.00, 1291500.00, 15400000.00, 44675.00, 16248825.00
  UNION ALL SELECT 'NV003', '2026-02', 20, 2, 16677500.00, 1291500.00, 19800000.00, 0.00, 15386000.00
  UNION ALL SELECT 'NV004', '2026-02', 20, 0, 14300000.00, 1123500.00, 15400000.00, 0.00, 13176500.00
  UNION ALL SELECT 'NV005', '2026-02', 20, 1, 12407812.50, 945000.00, 11000000.00, 23140.63, 11439671.88
  UNION ALL SELECT 'NV006', '2026-02', 20, 1, 18861250.00, 1554000.00, 15400000.00, 95362.50, 17211887.50
  UNION ALL SELECT 'NV001', '2026-03', 22, 1, 23678977.27, 1764000.00, 15400000.00, 401497.73, 21513479.55
  UNION ALL SELECT 'NV002', '2026-03', 22, 2, 17864204.55, 1323000.00, 15400000.00, 57060.23, 16484144.32
  UNION ALL SELECT 'NV003', '2026-03', 22, 2, 17057386.36, 1323000.00, 19800000.00, 0.00, 15734386.36
  UNION ALL SELECT 'NV004', '2026-03', 22, 0, 14700000.00, 1144500.00, 15400000.00, 0.00, 13555500.00
  UNION ALL SELECT 'NV005', '2026-03', 22, 1, 12700568.18, 966000.00, 11000000.00, 36728.41, 11697839.77
  UNION ALL SELECT 'NV006', '2026-03', 22, 2, 19400000.00, 1585500.00, 15400000.00, 120725.00, 17693775.00
  UNION ALL SELECT 'NV007', '2026-03', 22, 1, 11389488.64, 882000.00, 11000000.00, 0.00, 10507488.64
  UNION ALL SELECT 'NV001', '2026-04', 22, 2, 24466477.27, 1806000.00, 15400000.00, 476047.73, 22184429.55
  UNION ALL SELECT 'NV002', '2026-04', 22, 3, 18506534.09, 1354500.00, 15400000.00, 87601.70, 17064432.39
  UNION ALL SELECT 'NV003', '2026-04', 22, 3, 17596306.82, 1354500.00, 19800000.00, 0.00, 16241806.82
  UNION ALL SELECT 'NV004', '2026-04', 22, 0, 15100000.00, 1176000.00, 15400000.00, 0.00, 13924000.00
  UNION ALL SELECT 'NV005', '2026-04', 22, 1, 13002272.73, 997500.00, 11000000.00, 50238.64, 11954534.09
  UNION ALL SELECT 'NV006', '2026-04', 22, 2, 19908522.73, 1627500.00, 15400000.00, 144051.14, 18136971.59
  UNION ALL SELECT 'NV007', '2026-04', 22, 1, 11792045.45, 903000.00, 11000000.00, 0.00, 10889045.45
  UNION ALL SELECT 'NV008', '2026-04', 22, 2, 18477840.91, 1449000.00, 19800000.00, 0.00, 17028840.91
  UNION ALL SELECT 'NV001', '2026-05', 21, 2, 24992857.14, 1848000.00, 15400000.00, 524485.71, 22620371.43
  UNION ALL SELECT 'NV002', '2026-05', 21, 4, 19082142.86, 1386000.00, 15400000.00, 114807.14, 17581335.71
  UNION ALL SELECT 'NV003', '2026-05', 21, 4, 18164285.71, 1386000.00, 19800000.00, 0.00, 16778285.71
  UNION ALL SELECT 'NV004', '2026-05', 21, 0, 15400000.00, 1197000.00, 15400000.00, 0.00, 14203000.00
  UNION ALL SELECT 'NV005', '2026-05', 21, 2, 13419642.86, 1018500.00, 11000000.00, 70057.14, 12331085.71
  UNION ALL SELECT 'NV006', '2026-05', 21, 3, 20595535.71, 1659000.00, 15400000.00, 176826.79, 18759708.93
  UNION ALL SELECT 'NV007', '2026-05', 21, 1, 11998214.29, 924000.00, 11000000.00, 3710.71, 11070503.57
  UNION ALL SELECT 'NV008', '2026-05', 21, 3, 19047321.43, 1480500.00, 19800000.00, 0.00, 17566821.43
  UNION ALL SELECT 'NV009', '2026-05', 21, 0, 24200000.00, 1848000.00, 11000000.00, 952800.00, 21399200.00
  UNION ALL SELECT 'NV001', '2026-06', 22, 2, 25583522.73, 1890000.00, 15400000.00, 579352.27, 23114170.45
  UNION ALL SELECT 'NV002', '2026-06', 22, 5, 19711647.73, 1417500.00, 15400000.00, 144707.39, 18149440.34
  UNION ALL SELECT 'NV003', '2026-06', 22, 5, 18690340.91, 1417500.00, 19800000.00, 0.00, 17272840.91
  UNION ALL SELECT 'NV004', '2026-06', 22, 0, 15800000.00, 1228500.00, 15400000.00, 0.00, 14571500.00
  UNION ALL SELECT 'NV005', '2026-06', 22, 2, 13714772.73, 1039500.00, 11000000.00, 83763.64, 12591509.09
  UNION ALL SELECT 'NV006', '2026-06', 22, 3, 20983238.64, 1701000.00, 15400000.00, 194111.93, 19088126.70
  UNION ALL SELECT 'NV007', '2026-06', 22, 1, 12296306.82, 945000.00, 11000000.00, 17565.34, 11333741.48
  UNION ALL SELECT 'NV008', '2026-06', 22, 4, 19682954.55, 1512000.00, 19800000.00, 0.00, 18170954.55
  UNION ALL SELECT 'NV009', '2026-06', 22, 0, 24800000.00, 1890000.00, 11000000.00, 1036500.00, 21873500.00
  UNION ALL SELECT 'NV010', '2026-06', 22, 2, 15638636.36, 1228500.00, 15400000.00, 0.00, 14410136.36
  UNION ALL SELECT 'NV001', '2026-07', 23, 3, 26362500.00, 1932000.00, 15400000.00, 653050.00, 23777450.00
  UNION ALL SELECT 'NV002', '2026-07', 23, 6, 20131521.74, 1449000.00, 15400000.00, 164126.09, 18518395.65
  UNION ALL SELECT 'NV003', '2026-07', 23, 6, 19211956.52, 1449000.00, 19800000.00, 0.00, 17762956.52
  UNION ALL SELECT 'NV004', '2026-07', 23, 0, 16100000.00, 1260000.00, 15400000.00, 0.00, 14840000.00
  UNION ALL SELECT 'NV005', '2026-07', 23, 2, 14010326.09, 1060500.00, 11000000.00, 97491.30, 12852334.78
  UNION ALL SELECT 'NV006', '2026-07', 23, 4, 21629347.83, 1743000.00, 15400000.00, 224317.39, 19662030.43
  UNION ALL SELECT 'NV007', '2026-07', 23, 1, 12493750.00, 966000.00, 11000000.00, 26387.50, 11501362.50
  UNION ALL SELECT 'NV008', '2026-07', 23, 4, 20070652.17, 1543500.00, 19800000.00, 0.00, 18527152.17
  UNION ALL SELECT 'NV009', '2026-07', 23, 0, 25300000.00, 1932000.00, 11000000.00, 1105200.00, 22262800.00
  UNION ALL SELECT 'NV010', '2026-07', 23, 2, 15933152.17, 1260000.00, 15400000.00, 0.00, 14673152.17
  UNION ALL SELECT 'NV001', '2026-08', 21, 3, 26929464.29, 1974000.00, 15400000.00, 705546.43, 24249917.86
  UNION ALL SELECT 'NV002', '2026-08', 21, 6, 20732142.86, 1480500.00, 15400000.00, 192582.14, 19059060.71
  UNION ALL SELECT 'NV003', '2026-08', 21, 6, 19705357.14, 1480500.00, 19800000.00, 0.00, 18224857.14
  UNION ALL SELECT 'NV004', '2026-08', 21, 0, 16400000.00, 1281000.00, 15400000.00, 0.00, 15119000.00
  UNION ALL SELECT 'NV005', '2026-08', 21, 2, 14335714.29, 1081500.00, 11000000.00, 112710.71, 13141503.57
  UNION ALL SELECT 'NV006', '2026-08', 21, 4, 22103571.43, 1774500.00, 15400000.00, 246453.57, 20082617.86
  UNION ALL SELECT 'NV007', '2026-08', 21, 2, 12910714.29, 987000.00, 11000000.00, 46185.71, 11877528.57
  UNION ALL SELECT 'NV008', '2026-08', 21, 5, 20799107.14, 1575000.00, 19800000.00, 0.00, 19224107.14
  UNION ALL SELECT 'NV009', '2026-08', 21, 0, 25900000.00, 1974000.00, 11000000.00, 1188900.00, 22737100.00
  UNION ALL SELECT 'NV010', '2026-08', 21, 2, 16260714.29, 1281000.00, 15400000.00, 0.00, 14979714.29
  UNION ALL SELECT 'NV001', '2026-09', 22, 4, 27718181.82, 2016000.00, 15400000.00, 795327.27, 24906854.55
  UNION ALL SELECT 'NV002', '2026-09', 22, 7, 21261931.82, 1512000.00, 15400000.00, 217496.59, 19532435.23
  UNION ALL SELECT 'NV003', '2026-09', 22, 7, 20232102.27, 1512000.00, 19800000.00, 0.00, 18720102.27
  UNION ALL SELECT 'NV004', '2026-09', 22, 0, 16800000.00, 1312500.00, 15400000.00, 4375.00, 15483125.00
  UNION ALL SELECT 'NV005', '2026-09', 22, 3, 14742613.64, 1113000.00, 11000000.00, 131480.68, 13498132.95
  UNION ALL SELECT 'NV006', '2026-09', 22, 5, 22760795.45, 1816500.00, 15400000.00, 304429.55, 20639865.91
  UNION ALL SELECT 'NV007', '2026-09', 22, 2, 13204545.45, 1008000.00, 11000000.00, 59827.27, 12136718.18
  UNION ALL SELECT 'NV008', '2026-09', 22, 5, 21075568.18, 1617000.00, 19800000.00, 0.00, 19458568.18
  UNION ALL SELECT 'NV009', '2026-09', 22, 0, 26400000.00, 2016000.00, 11000000.00, 1257600.00, 23126400.00
  UNION ALL SELECT 'NV010', '2026-09', 22, 3, 16680965.91, 1312500.00, 15400000.00, 0.00, 15368465.91
) v
JOIN `users` u ON u.`employee_code` = v.`code`
JOIN `payroll_periods` p ON p.`month_year` = v.`month_year` AND p.`status` = 'PAID';

COMMIT;
