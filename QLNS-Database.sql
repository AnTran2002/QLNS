-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Nov 11, 2026 at 09:45 AM
-- Server version: 8.0.46
-- PHP Version: 8.3.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `qlns`
--
CREATE DATABASE IF NOT EXISTS `qlns` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `qlns`;

-- --------------------------------------------------------

--
-- Table structure for table `contracts`
--

CREATE TABLE `contracts` (
  `id` int NOT NULL,
  `user_id` int NOT NULL COMMENT 'Khóa ngoại liên kết với bảng users',
  `base_salary` decimal(12,2) NOT NULL COMMENT 'Mức lương cơ bản thỏa thuận',
  `insurance_salary` decimal(12,2) NOT NULL COMMENT 'Mức lương làm căn cứ đóng BHXH',
  `dependents_count` int DEFAULT '0' COMMENT 'Số người phụ thuộc (giảm trừ gia cảnh)',
  `allowance` decimal(12,2) DEFAULT '0.00' COMMENT 'Phụ cấp cố định hàng tháng',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payroll_items`
--

CREATE TABLE `payroll_items` (
  `id` int NOT NULL,
  `period_id` int NOT NULL COMMENT 'Khóa ngoại trỏ đến kỳ lương',
  `user_id` int NOT NULL COMMENT 'Khóa ngoại trỏ đến nhân viên',
  `actual_days` float NOT NULL COMMENT 'Số ngày công thực tế làm việc',
  `ot_hours` float DEFAULT '0' COMMENT 'Số giờ làm thêm (OT)',
  `gross_salary` decimal(12,2) NOT NULL COMMENT 'Tổng thu nhập Gross',
  `social_insurance` decimal(12,2) NOT NULL COMMENT 'Tiền trích trừ BHXH (10.5%)',
  `tax_deduction` decimal(12,2) NOT NULL COMMENT 'Tổng tiền giảm trừ gia cảnh',
  `personal_tax` decimal(12,2) NOT NULL COMMENT 'Thuế thu nhập cá nhân (TNCN)',
  `net_salary` decimal(12,2) NOT NULL COMMENT 'Lương thực nhận Net cuối cùng'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payroll_periods`
--

CREATE TABLE `payroll_periods` (
  `id` int NOT NULL,
  `month_year` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Định dạng kỳ lương YYYY-MM (VD: 2026-11)',
  `standard_days` int DEFAULT '22' COMMENT 'Số ngày công chuẩn trong tháng',
  `status` enum('DRAFT','LOCKED','PAID') COLLATE utf8mb4_unicode_ci DEFAULT 'DRAFT' COMMENT 'Trạng thái kỳ lương: Nháp -> Đã khóa -> Đã trả',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `employee_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Mã định danh nghiệp vụ (VD: NV001)',
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Họ và tên nhân viên',
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Email dùng đăng nhập hệ thống',
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Mật khẩu mã hóa Bcrypt',
  `role` enum('ADMIN','EMPLOYEE') COLLATE utf8mb4_unicode_ci DEFAULT 'EMPLOYEE' COMMENT 'Phân quyền hệ thống (RBAC)',
  `department` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Kỹ thuật' COMMENT 'Phòng ban',
  `position` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'Chức danh',
  `status` enum('Đang làm việc','Thử việc','Nghỉ phép') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Đang làm việc' COMMENT 'Trạng thái làm việc',
  `joined_at` date DEFAULT NULL COMMENT 'Ngày gia nhập',
  `avatar` mediumtext COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Ảnh đại diện (data URL)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo bản ghi'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `contract_salary_adjustments`
--

CREATE TABLE `contract_salary_adjustments` (
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
  KEY `idx_salary_adjustment_month` (`effective_month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `contracts`
--
ALTER TABLE `contracts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_contracts_user_id` (`user_id`);

--
-- Indexes for table `payroll_items`
--
ALTER TABLE `payroll_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_items_period_id` (`period_id`),
  ADD KEY `idx_items_user_id` (`user_id`),
  ADD UNIQUE KEY `uniq_period_user` (`period_id`, `user_id`);

--
-- Indexes for table `payroll_periods`
--
ALTER TABLE `payroll_periods`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `employee_code` (`employee_code`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `contracts`
--
ALTER TABLE `contracts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payroll_items`
--
ALTER TABLE `payroll_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payroll_periods`
--
ALTER TABLE `payroll_periods`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `contracts`
--
ALTER TABLE `contracts`
  ADD CONSTRAINT `fk_contracts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `contract_salary_adjustments`
--
ALTER TABLE `contract_salary_adjustments`
  ADD CONSTRAINT `fk_salary_adjustment_contract` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_salary_adjustment_actor` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `payroll_items`
--
ALTER TABLE `payroll_items`
  ADD CONSTRAINT `fk_items_period` FOREIGN KEY (`period_id`) REFERENCES `payroll_periods` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_items_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Sample data for database `qlns`
-- After importing this file, run `php Back-End/database/seed_passwords.php`
-- to replace the temporary password values with a bcrypt hash of `123456`.
--

INSERT INTO `users` (`id`, `employee_code`, `full_name`, `email`, `password`, `role`, `department`, `position`, `status`, `joined_at`, `created_at`) VALUES
(1, 'NV001', 'Nguyễn Văn An', 'an.nguyen@company.vn', '__PASSWORD_HASH_PENDING__', 'ADMIN', 'Nhân sự', 'Giám đốc nhân sự', 'Đang làm việc', '2026-01-01', '2026-01-01 09:00:00'),
(2, 'NV002', 'Trần Thị Bình', 'binh.tran@company.vn', '__PASSWORD_HASH_PENDING__', 'EMPLOYEE', 'Thiết kế', 'Senior UI/UX Designer', 'Đang làm việc', '2026-01-02', '2026-01-02 09:00:00'),
(3, 'NV003', 'Lê Hoàng Cường', 'cuong.le@company.vn', '__PASSWORD_HASH_PENDING__', 'EMPLOYEE', 'Kỹ thuật', 'Backend Developer', 'Đang làm việc', '2026-01-03', '2026-01-03 09:00:00'),
(4, 'NV004', 'Phạm Minh Đức', 'duc.pham@company.vn', '__PASSWORD_HASH_PENDING__', 'EMPLOYEE', 'Kỹ thuật', 'Frontend Developer', 'Đang làm việc', '2026-01-04', '2026-01-04 09:00:00'),
(5, 'NV005', 'Hoàng Thị Em', 'em.hoang@company.vn', '__PASSWORD_HASH_PENDING__', 'EMPLOYEE', 'Kinh doanh', 'Sales Executive', 'Thử việc', '2026-01-05', '2026-01-05 09:00:00');

INSERT INTO `contracts` (`id`, `user_id`, `base_salary`, `insurance_salary`, `dependents_count`, `allowance`, `created_at`) VALUES
(1, 1, 25000000.00, 20000000.00, 1, 3000000.00, '2026-01-01 09:00:00'),
(2, 2, 18500000.00, 15000000.00, 1, 2500000.00, '2026-01-02 09:00:00'),
(3, 3, 18000000.00, 15000000.00, 2, 2000000.00, '2026-01-03 09:00:00'),
(4, 4, 16000000.00, 13000000.00, 1, 1500000.00, '2026-01-04 09:00:00'),
(5, 5, 14000000.00, 11000000.00, 0, 1000000.00, '2026-01-05 09:00:00');

INSERT INTO `payroll_periods` (`id`, `month_year`, `standard_days`, `status`, `created_at`) VALUES
(1, '2026-10', 22, 'PAID', '2026-10-01 09:00:00'),
(2, '2026-11', 22, 'DRAFT', '2026-11-01 09:00:00'),
-- Các kỳ đã trả từ tháng 1/2026 (lương tăng dần mỗi tháng tới mức hợp đồng hiện tại)
(3, '2026-01', 22, 'PAID', '2026-01-01 09:00:00'),
(4, '2026-02', 20, 'PAID', '2026-02-01 09:00:00'),
(5, '2026-03', 22, 'PAID', '2026-03-01 09:00:00'),
(6, '2026-04', 22, 'PAID', '2026-04-01 09:00:00'),
(7, '2026-05', 21, 'PAID', '2026-05-01 09:00:00'),
(8, '2026-06', 22, 'PAID', '2026-06-01 09:00:00'),
(9, '2026-07', 23, 'PAID', '2026-07-01 09:00:00'),
(10, '2026-08', 21, 'PAID', '2026-08-01 09:00:00'),
(11, '2026-09', 22, 'PAID', '2026-09-01 09:00:00');

INSERT INTO `payroll_items` (`id`, `period_id`, `user_id`, `actual_days`, `ot_hours`, `gross_salary`, `social_insurance`, `tax_deduction`, `personal_tax`, `net_salary`) VALUES
(1, 1, 1, 22, 4, 28852272.73, 2100000.00, 15400000.00, 952840.91, 25799431.82),
(2, 1, 2, 22, 8, 22261363.64, 1575000.00, 15400000.00, 278636.36, 20407727.27),
(3, 1, 3, 21, 8, 20409090.91, 1575000.00, 19800000.00, 0.00, 18834090.91),
(4, 1, 4, 22, 0, 17500000.00, 1365000.00, 15400000.00, 36750.00, 16098250.00),
(5, 1, 5, 19, 3, 13448863.64, 1155000.00, 11000000.00, 64693.18, 12229170.45),
-- Tháng 1 → 9/2026, tính bằng PayrollEngine::calculateNetSalary (OT 1.5x, BHXH 10.5%, thuế TNCN 7 bậc)
(6, 3, 1, 22, 0, 22400000.00, 1680000.00, 15400000.00, 282000.00, 20438000.00),
(7, 3, 2, 21, 1, 16253409.09, 1260000.00, 15400000.00, 0.00, 14993409.09),
(8, 3, 3, 20, 1, 14813636.36, 1260000.00, 19800000.00, 0.00, 13553636.36),
(9, 3, 4, 20, 0, 12836363.64, 1092000.00, 15400000.00, 0.00, 11744363.64),
(10, 3, 5, 20, 0, 10981818.18, 924000.00, 11000000.00, 0.00, 10057818.18),
(11, 4, 1, 20, 1, 23192187.50, 1722000.00, 15400000.00, 357018.75, 21113168.75),
(12, 4, 2, 20, 2, 17585000.00, 1291500.00, 15400000.00, 44675.00, 16248825.00),
(13, 4, 3, 20, 2, 16677500.00, 1291500.00, 19800000.00, 0.00, 15386000.00),
(14, 4, 4, 20, 0, 14300000.00, 1123500.00, 15400000.00, 0.00, 13176500.00),
(15, 4, 5, 20, 1, 12407812.50, 945000.00, 11000000.00, 23140.63, 11439671.88),
(16, 5, 1, 22, 1, 23678977.27, 1764000.00, 15400000.00, 401497.73, 21513479.55),
(17, 5, 2, 22, 2, 17864204.55, 1323000.00, 15400000.00, 57060.23, 16484144.32),
(18, 5, 3, 22, 2, 17057386.36, 1323000.00, 19800000.00, 0.00, 15734386.36),
(19, 5, 4, 22, 0, 14700000.00, 1144500.00, 15400000.00, 0.00, 13555500.00),
(20, 5, 5, 22, 1, 12700568.18, 966000.00, 11000000.00, 36728.41, 11697839.77),
(21, 6, 1, 22, 2, 24466477.27, 1806000.00, 15400000.00, 476047.73, 22184429.55),
(22, 6, 2, 22, 3, 18506534.09, 1354500.00, 15400000.00, 87601.70, 17064432.39),
(23, 6, 3, 22, 3, 17596306.82, 1354500.00, 19800000.00, 0.00, 16241806.82),
(24, 6, 4, 22, 0, 15100000.00, 1176000.00, 15400000.00, 0.00, 13924000.00),
(25, 6, 5, 22, 1, 13002272.73, 997500.00, 11000000.00, 50238.64, 11954534.09),
(26, 7, 1, 21, 2, 24992857.14, 1848000.00, 15400000.00, 524485.71, 22620371.43),
(27, 7, 2, 21, 4, 19082142.86, 1386000.00, 15400000.00, 114807.14, 17581335.71),
(28, 7, 3, 21, 4, 18164285.71, 1386000.00, 19800000.00, 0.00, 16778285.71),
(29, 7, 4, 21, 0, 15400000.00, 1197000.00, 15400000.00, 0.00, 14203000.00),
(30, 7, 5, 21, 2, 13419642.86, 1018500.00, 11000000.00, 70057.14, 12331085.71),
(31, 8, 1, 22, 2, 25583522.73, 1890000.00, 15400000.00, 579352.27, 23114170.45),
(32, 8, 2, 22, 5, 19711647.73, 1417500.00, 15400000.00, 144707.39, 18149440.34),
(33, 8, 3, 22, 5, 18690340.91, 1417500.00, 19800000.00, 0.00, 17272840.91),
(34, 8, 4, 22, 0, 15800000.00, 1228500.00, 15400000.00, 0.00, 14571500.00),
(35, 8, 5, 22, 2, 13714772.73, 1039500.00, 11000000.00, 83763.64, 12591509.09),
(36, 9, 1, 23, 3, 26362500.00, 1932000.00, 15400000.00, 653050.00, 23777450.00),
(37, 9, 2, 23, 6, 20131521.74, 1449000.00, 15400000.00, 164126.09, 18518395.65),
(38, 9, 3, 23, 6, 19211956.52, 1449000.00, 19800000.00, 0.00, 17762956.52),
(39, 9, 4, 23, 0, 16100000.00, 1260000.00, 15400000.00, 0.00, 14840000.00),
(40, 9, 5, 23, 2, 14010326.09, 1060500.00, 11000000.00, 97491.30, 12852334.78),
(41, 10, 1, 21, 3, 26929464.29, 1974000.00, 15400000.00, 705546.43, 24249917.86),
(42, 10, 2, 21, 6, 20732142.86, 1480500.00, 15400000.00, 192582.14, 19059060.71),
(43, 10, 3, 21, 6, 19705357.14, 1480500.00, 19800000.00, 0.00, 18224857.14),
(44, 10, 4, 21, 0, 16400000.00, 1281000.00, 15400000.00, 0.00, 15119000.00),
(45, 10, 5, 21, 2, 14335714.29, 1081500.00, 11000000.00, 112710.71, 13141503.57),
(46, 11, 1, 22, 4, 27718181.82, 2016000.00, 15400000.00, 795327.27, 24906854.55),
(47, 11, 2, 22, 7, 21261931.82, 1512000.00, 15400000.00, 217496.59, 19532435.23),
(48, 11, 3, 22, 7, 20232102.27, 1512000.00, 19800000.00, 0.00, 18720102.27),
(49, 11, 4, 22, 0, 16800000.00, 1312500.00, 15400000.00, 4375.00, 15483125.00),
(50, 11, 5, 22, 3, 14742613.64, 1113000.00, 11000000.00, 131480.68, 13498132.95);

-- Chấm công theo ngày (giống migration 004)
-- 2) Bảng chấm công theo ngày. Mỗi nhân viên 1 dòng / ngày.
CREATE TABLE IF NOT EXISTS `attendance_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `work_date` date NOT NULL COMMENT 'Ngày làm việc',
  `shift` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Ca hành chính' COMMENT 'Tên ca',
  `shift_start` time NOT NULL DEFAULT '08:30:00',
  `shift_end` time NOT NULL DEFAULT '17:30:00',
  `check_in` time DEFAULT NULL COMMENT 'Giờ vào (NULL nếu nghỉ)',
  `check_out` time DEFAULT NULL COMMENT 'Giờ ra (NULL nếu nghỉ)',
  `status` enum('PRESENT','LATE','REMOTE','LEAVE','ABSENT') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PRESENT'
    COMMENT 'PRESENT đúng giờ · LATE đi muộn · REMOTE làm từ xa · LEAVE nghỉ phép · ABSENT nghỉ không phép',
  `work_hours` decimal(4,2) NOT NULL DEFAULT 0.00 COMMENT 'Giờ làm trong ca (đã trừ nghỉ trưa)',
  `ot_hours` decimal(4,2) NOT NULL DEFAULT 0.00 COMMENT 'Giờ làm thêm sau ca',
  `note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_date` (`user_id`, `work_date`),
  KEY `idx_attendance_date` (`work_date`),
  CONSTRAINT `fk_attendance_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) Dữ liệu mẫu: ngày thường (T2–T6) từ 01/09/2026 đến 20/11/2026 cho mọi tài khoản.
--    Trạng thái sinh cố định theo CRC32(mã người + ngày) nên chạy lại cho cùng kết quả (INSERT IGNORE).
INSERT IGNORE INTO `attendance_records`
  (`user_id`, `work_date`, `check_in`, `check_out`, `status`, `work_hours`, `ot_hours`, `note`)
SELECT
  x.user_id,
  x.work_date,
  CASE
    WHEN x.h < 9  THEN NULL
    WHEN x.h < 21 THEN ADDTIME('08:30:00', SEC_TO_TIME((1 + x.m % 40) * 60))
    ELSE SUBTIME('08:30:00', SEC_TO_TIME((1 + x.m % 25) * 60))
  END,
  CASE
    WHEN x.h < 9      THEN NULL
    WHEN x.m % 6 = 0  THEN ADDTIME('17:30:00', SEC_TO_TIME((90 + (x.m % 3) * 30) * 60))
    ELSE ADDTIME('17:30:00', SEC_TO_TIME((x.m % 20) * 60))
  END,
  CASE
    WHEN x.h < 6  THEN 'LEAVE'
    WHEN x.h < 9  THEN 'ABSENT'
    WHEN x.h < 21 THEN 'LATE'
    WHEN x.h < 28 THEN 'REMOTE'
    ELSE 'PRESENT'
  END,
  CASE
    WHEN x.h < 9  THEN 0
    WHEN x.h < 21 THEN ROUND(8 - (1 + x.m % 40) / 60, 2)
    ELSE 8
  END,
  CASE WHEN x.h >= 9 AND x.m % 6 = 0 THEN (90 + (x.m % 3) * 30) / 60 ELSE 0 END,
  CASE WHEN x.h < 6 THEN 'Nghỉ phép năm' WHEN x.h < 9 THEN 'Không báo trước' ELSE NULL END
FROM (
  SELECT
    u.id AS user_id,
    d.work_date,
    CRC32(CONCAT(u.employee_code, '|', d.work_date)) % 100 AS h,
    CRC32(CONCAT(d.work_date, '#', u.employee_code)) % 60 AS m
  FROM `users` u
  CROSS JOIN (
    SELECT DATE_ADD('2026-09-01', INTERVAL (a.n * 10 + b.n) DAY) AS work_date
    FROM (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
          UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a
    CROSS JOIN (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
          UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b
  ) d
  WHERE d.work_date <= '2026-11-20'
    AND DAYOFWEEK(d.work_date) NOT IN (1, 7)          -- bỏ Chủ nhật (1) và Thứ bảy (7)
    AND d.work_date <> '2026-09-02'                   -- Quốc khánh 2/9
    AND d.work_date >= COALESCE(u.joined_at, DATE(u.created_at))
) x;

--
-- --------------------------------------------------------
-- Đơn nghỉ phép (migration 005)
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `leave_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` enum('ANNUAL','SICK','UNPAID','OTHER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ANNUAL'
    COMMENT 'ANNUAL phép năm · SICK nghỉ ốm (BHXH chi trả) · UNPAID không lương · OTHER việc riêng có lương',
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

-- Điều chỉnh các phiếu lương từ kỳ tính thuế 2026 theo biểu thuế mới.
DROP TEMPORARY TABLE IF EXISTS `pit_recalculation_2026`;

CREATE TEMPORARY TABLE `pit_recalculation_2026` AS
SELECT
    pi.`id`,
    ROUND(15500000 + 6200000 * GREATEST(COALESCE(sa.`dependents_count`, c.`dependents_count`, 0), 0), 2) AS `family_deduction`,
    ROUND(GREATEST(
        0,
        pi.`gross_salary`
            - pi.`social_insurance`
            - (15500000 + 6200000 * GREATEST(COALESCE(sa.`dependents_count`, c.`dependents_count`, 0), 0))
            - CASE
                WHEN pp.`standard_days` > 0 THEN
                    pi.`ot_hours` * COALESCE(sa.`base_salary`, c.`base_salary`, 0) * 0.5
                        / (pp.`standard_days` * 8)
                ELSE 0
              END
    ), 2) AS `taxable_income`
FROM `payroll_items` pi
INNER JOIN `payroll_periods` pp ON pp.`id` = pi.`period_id`
LEFT JOIN `contracts` c ON c.`id` = (
    SELECT c2.`id`
    FROM `contracts` c2
    WHERE c2.`user_id` = pi.`user_id`
    ORDER BY c2.`created_at` DESC, c2.`id` DESC
    LIMIT 1
)
LEFT JOIN `contract_salary_adjustments` sa ON sa.`id` = (
    SELECT adjustment.`id`
    FROM `contract_salary_adjustments` adjustment
    WHERE adjustment.`contract_id` = c.`id`
      AND adjustment.`effective_month` <= pp.`month_year`
    ORDER BY adjustment.`effective_month` DESC, adjustment.`id` DESC
    LIMIT 1
)
WHERE pp.`month_year` >= '2026-01';

UPDATE `payroll_items` pi
INNER JOIN `pit_recalculation_2026` calc ON calc.`id` = pi.`id`
SET
    pi.`tax_deduction` = calc.`family_deduction`,
    pi.`personal_tax` = ROUND(CASE
        WHEN calc.`taxable_income` <= 10000000 THEN calc.`taxable_income` * 0.05
        WHEN calc.`taxable_income` <= 30000000 THEN 500000 + (calc.`taxable_income` - 10000000) * 0.10
        WHEN calc.`taxable_income` <= 60000000 THEN 2500000 + (calc.`taxable_income` - 30000000) * 0.20
        WHEN calc.`taxable_income` <= 100000000 THEN 8500000 + (calc.`taxable_income` - 60000000) * 0.30
        ELSE 20500000 + (calc.`taxable_income` - 100000000) * 0.35
    END, 2),
    pi.`net_salary` = ROUND(
        pi.`gross_salary` - pi.`social_insurance`
        - CASE
            WHEN calc.`taxable_income` <= 10000000 THEN calc.`taxable_income` * 0.05
            WHEN calc.`taxable_income` <= 30000000 THEN 500000 + (calc.`taxable_income` - 10000000) * 0.10
            WHEN calc.`taxable_income` <= 60000000 THEN 2500000 + (calc.`taxable_income` - 30000000) * 0.20
            WHEN calc.`taxable_income` <= 100000000 THEN 8500000 + (calc.`taxable_income` - 60000000) * 0.30
            ELSE 20500000 + (calc.`taxable_income` - 100000000) * 0.35
          END,
        2
    );

DROP TEMPORARY TABLE `pit_recalculation_2026`;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
