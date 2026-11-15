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

--
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
