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
(2, '2026-11', 22, 'DRAFT', '2026-11-01 09:00:00');

INSERT INTO `payroll_items` (`id`, `period_id`, `user_id`, `actual_days`, `ot_hours`, `gross_salary`, `social_insurance`, `tax_deduction`, `personal_tax`, `net_salary`) VALUES
(1, 1, 1, 22, 4, 28852272.73, 2100000.00, 15400000.00, 952840.91, 25799431.82),
(2, 1, 2, 22, 8, 22261363.64, 1575000.00, 15400000.00, 278636.36, 20407727.27),
(3, 1, 3, 21, 8, 20409090.91, 1575000.00, 19800000.00, 0.00, 18834090.91),
(4, 1, 4, 22, 0, 17500000.00, 1365000.00, 15400000.00, 36750.00, 16098250.00),
(5, 1, 5, 19, 3, 13448863.64, 1155000.00, 11000000.00, 64693.18, 12229170.45);

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
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
