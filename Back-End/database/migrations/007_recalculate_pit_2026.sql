-- Migration 007: tính lại giảm trừ gia cảnh, thuế TNCN và net từ kỳ tính thuế 2026.
-- Chạy sau khi đã nhập dữ liệu lương mẫu nếu có; có thể chạy lặp lại an toàn.
-- Quy tắc: biểu 5 bậc và giảm trừ 15,5tr/6,2tr; phần OT cao hơn lương giờ thường được miễn thuế.

USE `qlns`;

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
