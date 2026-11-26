<?php

require_once __DIR__ . '/PayrollChangePolicy.php';

class ContractSalaryAdjustmentPolicy
{
    private const SALARY_FIELDS = ['base_salary', 'insurance_salary', 'allowance'];
    private const COMPENSATION_FIELDS = ['base_salary', 'insurance_salary', 'allowance', 'dependents_count'];

    public static function effectiveMonth(?DateTimeImmutable $today = null): string
    {
        return ($today ?? new DateTimeImmutable('today'))
            ->modify('first day of next month')
            ->format('Y-m');
    }

    public static function validate(array $input): array
    {
        [$reasonError, $reason] = PayrollChangePolicy::validateReason($input['reason'] ?? null);
        if ($reasonError !== null) {
            return [$reasonError, null];
        }

        $values = [];
        foreach (self::SALARY_FIELDS as $field) {
            $value = $input[$field] ?? null;
            if (!is_numeric($value) || !is_finite((float) $value) || (float) $value < 0 || (float) $value > 9999999999) {
                return ["Trường {$field} phải là số không âm", null];
            }
            $values[$field] = round((float) $value, 2);
        }

        $dependents = filter_var($input['dependents_count'] ?? null, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 0, 'max_range' => 99],
        ]);
        if ($dependents === false) {
            return ['dependents_count phải là số nguyên từ 0 đến 99', null];
        }

        $values['dependents_count'] = $dependents;
        $values['reason'] = $reason;
        return [null, $values];
    }

    public static function hasChanges(array $current, array $newValues): bool
    {
        foreach (self::COMPENSATION_FIELDS as $field) {
            if ((float) $current[$field] !== (float) $newValues[$field]) {
                return true;
            }
        }
        return false;
    }

    public static function containsCompensationFields(array $input): bool
    {
        return array_intersect(self::COMPENSATION_FIELDS, array_keys($input)) !== [];
    }
}
