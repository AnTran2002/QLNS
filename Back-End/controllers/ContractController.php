<?php

require_once __DIR__ . '/../services/ContractSalaryAdjustmentPolicy.php';

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
        if (!require_method('GET') || !require_auth('ADMIN')) {
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
        if (!require_method('GET') || !require_auth('ADMIN')) {
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

    /** Không cho sửa trực tiếp thông tin lương của hợp đồng đã lưu. */
    public function update($id = null)
    {
        if (!require_method('PUT', 'POST', 'PATCH') || !require_auth('ADMIN')) {
            return;
        }

        json_response(409, null, 'Không thể sửa trực tiếp hợp đồng; hãy tạo điều chỉnh lương kèm lý do');
    }

    /**
     * GET ?action=contracts/adjustments&contract_id=1
     * POST ?action=contracts/adjustments&contract_id=1
     */
    public function adjustments()
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        if (!in_array($method, ['GET', 'POST'], true)) {
            header('Allow: GET, POST');
            return json_response(405, null, 'Phương thức không được hỗ trợ');
        }
        if (!require_auth('ADMIN')) {
            return;
        }

        $contractId = filter_var($_GET['contract_id'] ?? null, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1],
        ]);
        if ($contractId === false) {
            return json_response(400, null, 'Thiếu hoặc sai tham số contract_id');
        }

        $model = new ContractSalaryAdjustmentModel();
        if ($method === 'GET') {
            if (!$this->contractModel->findByIdWithUser((int) $contractId)) {
                return json_response(404, null, 'Không tìm thấy hợp đồng');
            }
            return json_response(200, $model->getHistory((int) $contractId), 'Lấy lịch sử điều chỉnh lương thành công');
        }

        $input = read_json_body();
        if ($input === null) {
            return json_response(400, null, 'Dữ liệu JSON không hợp lệ');
        }

        [$error, $values] = ContractSalaryAdjustmentPolicy::validate($input);
        if ($error !== null) {
            return json_response(422, null, $error);
        }

        try {
            $today = new DateTimeImmutable('today');
            $adjustment = $model->create(
                (int) $contractId,
                $values,
                (int) $_SESSION['user_id'],
                $today->format('Y-m'),
                ContractSalaryAdjustmentPolicy::effectiveMonth($today)
            );
            if ($adjustment === null) {
                return json_response(404, null, 'Không tìm thấy hợp đồng');
            }

            return json_response(201, $adjustment, 'Đã ghi nhận điều chỉnh lương');
        } catch (DomainException $e) {
            return json_response(422, null, $e->getMessage());
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                return json_response(409, null, 'Hợp đồng đã có điều chỉnh lương cho tháng hiệu lực kế tiếp');
            }
            throw $e;
        }
    }
}
