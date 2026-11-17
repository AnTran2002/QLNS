<?php

class ContractController
{
    private ContractModel $contractModel;

    public function __construct()
    {
        $this->contractModel = new ContractModel();
    }

    /**
     * GET /api/contracts hoặc ?action=contracts
     * Lấy danh sách toàn bộ hợp đồng kèm thông tin nhân sự
     */
    public function index()
    {
        if (!require_method('GET')) {
            return;
        }

        try {
            $contracts = $this->contractModel->getAllWithUser();
            json_response(200, $contracts, 'Lấy danh sách hợp đồng thành công');
        } catch (Throwable $e) {
            json_response(500, null, 'Lỗi lấy danh sách hợp đồng: ' . $e->getMessage());
        }
    }

    /**
     * GET /api/contracts/{id} hoặc ?action=contracts/show&id={id}
     * Lấy chi tiết thông tin hợp đồng của 1 nhân viên
     */
    public function show($id = null)
    {
        if (!require_method('GET')) {
            return;
        }

        $id = $id ?? ($_GET['id'] ?? null);
        if (!$id || !is_numeric($id)) {
            return json_response(400, null, 'Thiếu hoặc sai tham số id hợp đồng');
        }

        try {
            $contract = $this->contractModel->findByIdWithUser((int) $id);
            if (!$contract) {
                return json_response(404, null, 'Không tìm thấy hợp đồng');
            }

            json_response(200, $contract, 'Lấy chi tiết hợp đồng thành công');
        } catch (Throwable $e) {
            json_response(500, null, 'Lỗi lấy chi tiết hợp đồng: ' . $e->getMessage());
        }
    }

    /**
     * PUT /api/contracts/{id} hoặc ?action=contracts/update&id={id}
     * Cập nhật thông số lương cơ bản, BHXH, giảm trừ gia cảnh
     */
    public function update($id = null)
    {
        if (!require_method('PUT', 'POST', 'PATCH')) {
            return;
        }

        $id = $id ?? ($_GET['id'] ?? null);
        if (!$id || !is_numeric($id)) {
            return json_response(400, null, 'Thiếu hoặc sai tham số id hợp đồng');
        }

        $body = read_json_body() ?? $_POST;
        if (empty($body)) {
            return json_response(400, null, 'Dữ liệu cập nhật không hợp lệ hoặc rỗng');
        }

        try {
            $existing = $this->contractModel->findByIdWithUser((int) $id);
            if (!$existing) {
                return json_response(404, null, 'Không tìm thấy hợp đồng để cập nhật');
            }

            $updateData = [
                'base_salary'      => $body['base_salary'] ?? $existing['base_salary'],
                'insurance_salary' => $body['insurance_salary'] ?? $existing['insurance_salary'],
                'allowance'        => $body['allowance'] ?? $existing['allowance'],
                'dependents_count' => $body['dependents_count'] ?? $existing['dependents_count'],
            ];

            $ok = $this->contractModel->updateContract((int) $existing['id'], $updateData);
            if ($ok) {
                $updated = $this->contractModel->findByIdWithUser((int) $existing['id']);
                json_response(200, $updated, 'Cập nhật thông số hợp đồng thành công');
            } else {
                json_response(500, null, 'Cập nhật thông số hợp đồng thất bại');
            }
        } catch (Throwable $e) {
            json_response(500, null, 'Lỗi cập nhật hợp đồng: ' . $e->getMessage());
        }
    }
}
