-- Một tháng chỉ có một kỳ lương; cần để chống tạo trùng khi có request đồng thời.
ALTER TABLE `payroll_periods`
  ADD UNIQUE KEY `uniq_payroll_month_year` (`month_year`);
