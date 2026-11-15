<?php

$action = $_GET['action'] ?? '/';

match ($action) {
    '/'                  => (new HomeController)->index(),
    'login'              => (new AuthController)->login(),
    'me'                 => (new AuthController)->me(),
    'logout'             => (new AuthController)->logout(),
    'employee/dashboard' => (new EmployeeController)->dashboard(),
    'payroll/calculate'  => (new PayrollController)->calculateAndSave(),
    default              => (function () {
        header('Content-Type: application/json; charset=UTF-8');
        http_response_code(404);
        echo json_encode(['success' => false, 'data' => null, 'message' => 'Không tìm thấy API']);
    })(),
};
