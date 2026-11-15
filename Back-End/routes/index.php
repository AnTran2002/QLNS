<?php

/**
 * Bảng định tuyến API. Gọi theo dạng: /?action=<tên action>
 * Ví dụ: GET http://localhost:8000/?action=employees
 */
$action = $_GET['action'] ?? '/';

match ($action) {
    // Kiểm tra backend + database
    '/'                  => (new HomeController)->index(),

    // Xác thực
    'login'              => (new AuthController)->login(),
    'me'                 => (new AuthController)->me(),
    'logout'             => (new AuthController)->logout(),

    // Nhân viên (EMPLOYEE)
    'employee/dashboard' => (new EmployeeController)->dashboard(),

    // Quản lý nhân viên + hợp đồng (ADMIN)
    'employees'          => (new EmployeeController)->index(),
    'employees/show'     => (new EmployeeController)->show(),
    'employees/create'   => (new EmployeeController)->store(),
    'employees/update'   => (new EmployeeController)->update(),
    'employees/delete'   => (new EmployeeController)->destroy(),

    // Bảng lương (ADMIN)
    'payroll/calculate'  => (new PayrollController)->calculateAndSave(),

    default              => json_response(404, null, 'Không tìm thấy API'),
};
