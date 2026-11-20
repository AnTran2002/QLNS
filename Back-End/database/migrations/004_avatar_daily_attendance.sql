-- Migration 004: ảnh đại diện + chấm công theo ngày (lịch tháng ở cổng nhân viên).
-- Chạy MỘT LẦN trên database `qlns` (phpMyAdmin → chọn qlns → tab SQL → dán → Go).
-- Nếu import mới QLNS-Database.sql thì KHÔNG cần chạy file này (đã có sẵn).

USE `qlns`;

-- 1) Ảnh đại diện: lưu data URL (JPEG/PNG/WebP đã thu nhỏ ở trình duyệt, ≤ 400 KB).
ALTER TABLE `users`
  ADD COLUMN `avatar` mediumtext COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Ảnh đại diện (data URL)' AFTER `joined_at`;

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
