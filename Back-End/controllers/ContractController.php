<?php

/**
 * Hợp đồng chỉ xem (read-only). Điều chỉnh lương đi qua employees/update → phụ lục mới kèm lý do.
 */
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
}
