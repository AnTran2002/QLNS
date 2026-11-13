<?php

$action = $_GET['action'] ?? '/';

match ($action) {
    '/'                  => (new HomeController)->index(),
    'login'              => (new AuthController)->login(),
    'me'                 => (new AuthController)->me(),
    'logout'             => (new AuthController)->logout(),
    'employee/dashboard' => (new EmployeeController)->dashboard(),
};
