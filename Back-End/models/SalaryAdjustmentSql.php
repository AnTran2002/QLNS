<?php

class SalaryAdjustmentSql
{
    public static function selectedFields(string $contractAlias = 'c', string $adjustmentAlias = 'sa'): string
    {
        return "COALESCE({$adjustmentAlias}.base_salary, {$contractAlias}.base_salary) AS base_salary,
                COALESCE({$adjustmentAlias}.insurance_salary, {$contractAlias}.insurance_salary) AS insurance_salary,
                COALESCE({$adjustmentAlias}.allowance, {$contractAlias}.allowance) AS allowance,
                COALESCE({$adjustmentAlias}.dependents_count, {$contractAlias}.dependents_count) AS dependents_count";
    }

    public static function effectiveJoin(
        string $contractAlias = 'c',
        string $adjustmentAlias = 'sa',
        string $monthExpression = ':effective_month'
    ): string {
        return "LEFT JOIN contract_salary_adjustments {$adjustmentAlias} ON {$adjustmentAlias}.id = (
                    SELECT adjustment.id
                    FROM contract_salary_adjustments adjustment
                    WHERE adjustment.contract_id = {$contractAlias}.id
                      AND adjustment.effective_month <= {$monthExpression}
                    ORDER BY adjustment.effective_month DESC, adjustment.id DESC
                    LIMIT 1
                )";
    }
}
