<?php

require_once __DIR__ . '/../services/PayrollConfig.php';
require_once __DIR__ . '/../services/ContractSchema.php';

/**
 * GET meta — Danh mục dùng chung cho Front-End, lấy từ database + cấu hình Back-End (không mã cứng ở giao diện).
 * Công khai (trang đăng nhập dùng tên ứng dụng); không chứa dữ liệu cá nhân.
 */
class MetaController
{
    public function index()
    {
        if (!require_method('GET')) {
            return;
        }
        $m = new BranchModel();
        $year = (int) date('Y');
        json_response(200, [
            'app_name' => 'PeopleOS',
            'company' => ContractSchema::COMPANY,
            'branches' => array_map(fn ($b) => ['id' => (int) $b['id']] + $b, $m->allActive()),
            'departments' => $m->departments(),
            'employee_statuses' => $m->enumValues('users', 'status') ?: ['Đang làm việc', 'Thử việc', 'Nghỉ phép'],
            'roles' => $m->enumValues('users', 'role'),
            'genders' => ContractSchema::GENDERS,
            'leave_types' => $m->enumValues('leave_requests', 'type'),
            'contract_types' => ContractSchema::CONTRACT_TYPES,
            'holidays' => array_merge($m->holidays($year), $m->holidays($year + 1)),
            'payroll' => PayrollConfig::toArray($year),
            'contract_schema' => ContractSchema::toArray(),
        ], 'Lấy danh mục thành công');
    }
}
