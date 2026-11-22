<?php

require_once __DIR__ . '/BaseModel.php';
require_once __DIR__ . '/SalaryAdjustmentSql.php';
require_once __DIR__ . '/../services/ContractSalaryAdjustmentPolicy.php';

class ContractSalaryAdjustmentModel extends BaseModel
{
    public function getHistory(int $contractId): array
    {
        $stmt = $this->db->prepare(
            "SELECT adjustment.id, adjustment.effective_month,
                    adjustment.previous_base_salary, adjustment.previous_insurance_salary,
                    adjustment.previous_allowance, adjustment.previous_dependents_count,
                    adjustment.base_salary, adjustment.insurance_salary,
                    adjustment.allowance, adjustment.dependents_count,
                    adjustment.reason, adjustment.created_at,
                    adjustment.changed_by, actor.full_name AS changed_by_name
             FROM contract_salary_adjustments adjustment
             LEFT JOIN users actor ON actor.id = adjustment.changed_by
             WHERE adjustment.contract_id = :contract_id
             ORDER BY adjustment.effective_month DESC, adjustment.id DESC"
        );
        $stmt->execute(['contract_id' => $contractId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function create(
        int $contractId,
        array $values,
        int $changedBy,
        string $currentMonth,
        string $effectiveMonth
    ): ?array {
        $this->beginTransaction();

        try {
            $stmt = $this->db->prepare(
                "SELECT c.id, " . SalaryAdjustmentSql::selectedFields() . "
                 FROM contracts c
                 " . SalaryAdjustmentSql::effectiveJoin('c', 'sa', ':current_month') . "
                 WHERE c.id = :contract_id
                 LIMIT 1
                 FOR UPDATE"
            );
            $stmt->execute(['contract_id' => $contractId, 'current_month' => $currentMonth]);
            $current = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$current) {
                $this->rollBack();
                return null;
            }

            if (!ContractSalaryAdjustmentPolicy::hasChanges($current, $values)) {
                throw new DomainException('Thông số điều chỉnh phải khác thông số hiện tại');
            }

            $stmt = $this->db->prepare(
                "INSERT INTO contract_salary_adjustments (
                    contract_id, effective_month,
                    previous_base_salary, previous_insurance_salary, previous_allowance, previous_dependents_count,
                    base_salary, insurance_salary, allowance, dependents_count, reason, changed_by
                 ) VALUES (
                    :contract_id, :effective_month,
                    :previous_base_salary, :previous_insurance_salary, :previous_allowance, :previous_dependents_count,
                    :base_salary, :insurance_salary, :allowance, :dependents_count, :reason, :changed_by
                 )"
            );
            $stmt->execute([
                'contract_id' => $contractId,
                'effective_month' => $effectiveMonth,
                'previous_base_salary' => $current['base_salary'],
                'previous_insurance_salary' => $current['insurance_salary'],
                'previous_allowance' => $current['allowance'],
                'previous_dependents_count' => $current['dependents_count'],
                'base_salary' => $values['base_salary'],
                'insurance_salary' => $values['insurance_salary'],
                'allowance' => $values['allowance'],
                'dependents_count' => $values['dependents_count'],
                'reason' => $values['reason'],
                'changed_by' => $changedBy,
            ]);
            $adjustmentId = (int) $this->db->lastInsertId();

            $stmt = $this->db->prepare(
                "SELECT adjustment.id, adjustment.effective_month,
                        adjustment.previous_base_salary, adjustment.previous_insurance_salary,
                        adjustment.previous_allowance, adjustment.previous_dependents_count,
                        adjustment.base_salary, adjustment.insurance_salary,
                        adjustment.allowance, adjustment.dependents_count,
                        adjustment.reason, adjustment.created_at,
                        adjustment.changed_by, actor.full_name AS changed_by_name
                 FROM contract_salary_adjustments adjustment
                 LEFT JOIN users actor ON actor.id = adjustment.changed_by
                 WHERE adjustment.id = :id
                 LIMIT 1"
            );
            $stmt->execute(['id' => $adjustmentId]);
            $adjustment = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$adjustment) {
                throw new RuntimeException('Không thể tải bản ghi điều chỉnh lương vừa tạo');
            }
            $this->commit();
            return $adjustment;
        } catch (Throwable $e) {
            $this->rollBack();
            throw $e;
        }
    }
}
