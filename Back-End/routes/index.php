<?php

/**
 * Bảng định tuyến API.
 * Hỗ trợ 2 kiểu gọi:
 * 1. Dạng RESTful URL:
 *    - GET  /api/contracts        hoặc /contracts
 *    - GET  /api/contracts/{id}   hoặc /contracts/{id}
 * 2. Dạng query parameter:
 *    - GET  /?action=contracts
 *    - GET  /?action=contracts/show&id={id}
 */

$action = $_GET['action'] ?? null;

if (!$action) {
    // Phân tích từ REQUEST_URI (bỏ qua query string)
    $uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';

    // Loại bỏ đường dẫn thư mục chứa script nếu chạy trong subdirectory (XAMPP / Laragon)
    $scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? ''));
    if ($scriptDir !== '/' && $scriptDir !== '' && strpos($uriPath, $scriptDir) === 0) {
        $uriPath = substr($uriPath, strlen($scriptDir));
    }

    $path = trim($uriPath, '/');

    // Bỏ qua index.php nếu có trên URL
    if (strpos($path, 'index.php/') === 0) {
        $path = substr($path, 10);
    } elseif ($path === 'index.php') {
        $path = '';
    }

    // Bỏ qua tiền tố api/ nếu có (VD: /api/contracts -> contracts)
    if (strpos($path, 'api/') === 0) {
        $path = substr($path, 4);
    } elseif ($path === 'api') {
        $path = '';
    }

    // Nhận diện RESTful route cho contracts (UC-01)
    if (preg_match('#^contracts/(\d+)$#', $path, $matches)) {
        $_GET['id'] = $matches[1];
        $action = 'contracts/show';
    } elseif ($path === 'contracts') {
        $action = 'contracts';
    } elseif (preg_match('#^employees/(\d+)$#', $path, $matches)) {
        $_GET['id'] = $matches[1];
        $action = 'employees/show';
    } elseif ($path === '' || $path === '/') {
        $action = '/';
    } else {
        $action = $path;
    }
}

match ($action) {
    // Kiểm tra backend + database
    '/'                  => (new HomeController)->index(),

    // Xác thực
    'login'              => (new AuthController)->login(),
    'me'                 => (new AuthController)->me(),
    'logout'             => (new AuthController)->logout(),

    // Hợp đồng (UC-01: Lấy danh sách, xem chi tiết, cập nhật)
    'contracts'          => (new ContractController)->index(),
    'contracts/show'     => (new ContractController)->show($_GET['id'] ?? null),

    // Nhân viên (EMPLOYEE)
    'employee/dashboard' => (new EmployeeController)->dashboard(),
    'employee/attendance' => (new EmployeeController)->attendance(),

    // Nghỉ phép (migration 005)
    'employee/leave'        => ($_SERVER['REQUEST_METHOD'] === 'POST' ? (new LeaveController)->store() : (new LeaveController)->mine()),
    'employee/leave/cancel' => (new LeaveController)->cancel(),
    'leave/requests'        => (new LeaveController)->index(),
    'leave/review'          => (new LeaveController)->review(),

    // Hồ sơ của chính mình (ADMIN + EMPLOYEE)
    'profile/avatar'     => (new ProfileController)->updateAvatar(),

    // Quản lý nhân viên + hợp đồng (ADMIN)
    'employees'          => (new EmployeeController)->index(),
    'employees/show'     => (new EmployeeController)->show(),
    'employees/create'   => (new EmployeeController)->store(),
    'employees/update'   => (new EmployeeController)->update(),
    'employees/delete'   => (new EmployeeController)->destroy(),

    // Bảng lương (ADMIN)
    'payroll/periods'    => (new PayrollController)->periods(),
    'payroll/items'      => (new PayrollController)->items(),
    'payroll/attendance' => (new PayrollController)->attendance(),
    'payroll/run'        => (new PayrollController)->run(),
    'payroll/lock'       => (new PayrollController)->lockPeriod(),
    'payroll/bank-account' => (new PayrollController)->saveBankAccount(),
    'payroll/export-bank-transfers' => (new PayrollController)->exportBankTransfers(),
    'payroll/payslip' => (new PayrollController)->payslip(),
    'payroll/payslip/download' => (new PayrollController)->downloadPayslip(),

    default              => json_response(404, null, 'Không tìm thấy API: ' . $action),
};
