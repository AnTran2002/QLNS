<?php

class EmployeeController
{
    /**
     * GET /employee/dashboard — Employee dashboard data
     */
    public function dashboard()
    {
        header('Content-Type: application/json');

        // Check authentication
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'data' => null, 'message' => 'Chưa đăng nhập']);
            return;
        }

        // Check role
        if ($_SESSION['role'] !== 'EMPLOYEE') {
            http_response_code(403);
            echo json_encode(['success' => false, 'data' => null, 'message' => 'Không có quyền truy cập']);
            return;
        }

        $userId = $_SESSION['user_id'];

        $userModel     = new UserModel();
        $contractModel = new ContractModel();
        $payrollModel  = new PayrollModel();

        $user     = $userModel->findById($userId);
        $contract = $contractModel->findByUserId($userId);
        $payroll  = $payrollModel->getItemsByUserId($userId);
        $period   = $payrollModel->getCurrentPeriod();

        if (!$user) {
            http_response_code(404);
            echo json_encode(['success' => false, 'data' => null, 'message' => 'Không tìm thấy người dùng']);
            return;
        }

        // Attendance summary from payroll items
        $totalActualDays = 0;
        $totalOtHours    = 0;
        foreach ($payroll as $item) {
            $totalActualDays += (float) $item['actual_days'];
            $totalOtHours    += (float) $item['ot_hours'];
        }

        // Work schedule
        $workSchedule = [
            'monday'    => '08:30 - 17:30',
            'tuesday'   => '08:30 - 17:30',
            'wednesday' => '08:30 - 17:30',
            'thursday'  => '08:30 - 17:30',
            'friday'    => '08:30 - 17:30',
            'saturday'  => 'Nghỉ tuần',
            'sunday'    => 'Nghỉ tuần',
        ];

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data'    => [
                'user_info' => [
                    'full_name'     => $user['full_name'],
                    'email'         => $user['email'],
                    'employee_code' => $user['employee_code'],
                    'role'          => $user['role'],
                ],
                'contract' => $contract ? [
                    'base_salary'      => $contract['base_salary'],
                    'insurance_salary' => $contract['insurance_salary'],
                    'allowance'        => $contract['allowance'],
                    'dependents_count' => $contract['dependents_count'],
                ] : null,
                'payroll_history' => $payroll,
                'attendance_summary' => [
                    'total_actual_days' => $totalActualDays,
                    'total_ot_hours'    => $totalOtHours,
                ],
                'current_period'  => $period ?: null,
                'work_schedule'   => $workSchedule,
            ],
            'message' => 'Lấy dữ liệu dashboard thành công',
        ]);
    }
}

