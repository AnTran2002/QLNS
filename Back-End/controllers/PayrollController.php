<?php

require_once __DIR__ . '/../services/PayrollEngine.php';

class PayrollController
{
    public function calculateAndSave()
    {
        header('Content-Type: application/json; charset=UTF-8');

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            header('Allow: POST');
            return $this->respond(405, null, 'Phương thức không được hỗ trợ');
        }

        if (!isset($_SESSION['user_id'])) {
            return $this->respond(401, null, 'Chưa đăng nhập');
        }

        if (($_SESSION['role'] ?? null) !== 'ADMIN') {
            return $this->respond(403, null, 'Không có quyền thực hiện');
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($input)) {
            return $this->respond(400, null, 'Dữ liệu JSON không hợp lệ');
        }

        $userId = filter_var($input['user_id'] ?? null, FILTER_VALIDATE_INT);
        $periodId = filter_var($input['period_id'] ?? null, FILTER_VALIDATE_INT);
        if ($userId === false || $userId < 1 || $periodId === false || $periodId < 1) {
            return $this->respond(400, null, 'user_id và period_id phải là số nguyên dương');
        }

        foreach (['actual_days', 'ot_hours'] as $field) {
            if (!isset($input[$field]) || !is_numeric($input[$field]) || !is_finite((float) $input[$field])) {
                return $this->respond(400, null, "{$field} phải là một số hợp lệ");
            }
            if ((float) $input[$field] < 0) {
                return $this->respond(400, null, "{$field} không được âm");
            }
        }

        try {
            $contractModel = new ContractModel();
            $payrollModel = new PayrollModel();

            $contract = $contractModel->findByUserId($userId);
            if (!$contract) {
                return $this->respond(404, null, 'Không tìm thấy hợp đồng của nhân viên');
            }

            $period = $payrollModel->getPeriodById($periodId);
            if (!$period) {
                return $this->respond(404, null, 'Không tìm thấy kỳ lương');
            }
            if ($period['status'] !== 'DRAFT') {
                return $this->respond(409, null, 'Chỉ được tính và lưu lương cho kỳ đang ở trạng thái DRAFT');
            }

            $standardDays = (float) $period['standard_days'];
            if ($standardDays <= 0) {
                return $this->respond(422, null, 'Kỳ lương có số ngày công chuẩn không hợp lệ');
            }

            $actualDays = (float) $input['actual_days'];
            $otHours = (float) $input['ot_hours'];
            $calculation = PayrollEngine::calculateNetSalary(
                (float) $contract['base_salary'],
                (float) $contract['allowance'],
                $actualDays,
                $standardDays,
                $otHours,
                1.5,
                (int) $contract['dependents_count'],
                (float) $contract['insurance_salary']
            );

            $payrollModel->saveOrUpdate($periodId, $userId, [
                'actual_days' => $actualDays,
                'ot_hours' => $otHours,
                'gross_salary' => $calculation['gross_salary'],
                'social_insurance' => $calculation['social_insurance'],
                'tax_deduction' => $calculation['tax_deduction'],
                'personal_tax' => $calculation['personal_tax'],
                'net_salary' => $calculation['net_salary'],
            ]);

            return $this->respond(200, [
                'user_id' => $userId,
                'period' => $period,
                'calculation' => $calculation,
            ], 'Đã tính và lưu bảng lương');
        } catch (PDOException $e) {
            error_log($e->getMessage());
            return $this->respond(500, null, 'Không thể xử lý bảng lương do lỗi cơ sở dữ liệu');
        }
    }

    private function respond($statusCode, $data, $message)
    {
        http_response_code($statusCode);
        echo json_encode([
            'success' => $statusCode >= 200 && $statusCode < 300,
            'data' => $data,
            'message' => $message,
        ]);
    }
}
