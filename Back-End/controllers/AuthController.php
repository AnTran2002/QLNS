<?php

class AuthController
{
    /**
     * POST /login — JSON {employee_code / email, password}
     */
    public function login()
    {
        header('Content-Type: application/json');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'data' => null, 'message' => 'Method not allowed']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $identifier = trim($input['employee_code'] ?? $input['identifier'] ?? $input['email'] ?? '');
        $password = $input['password'] ?? '';

        if (empty($identifier) || empty($password)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'data' => null, 'message' => 'Mã nhân viên và mật khẩu không được để trống']);
            return;
        }

        $userModel = new UserModel();
        $user = $userModel->findByCodeOrEmail($identifier);

        if (!$user || !password_verify($password, $user['password'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'data' => null, 'message' => 'Mã nhân viên hoặc mật khẩu không chính xác']);
            return;
        }

        // Set session
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['role']    = $user['role'];
        $_SESSION['token']   = bin2hex(random_bytes(32));

        // Remove password from response
        unset($user['password']);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data'    => [
                'user'  => $user,
                'token' => $_SESSION['token'],
            ],
            'message' => 'Đăng nhập thành công',
        ]);
    }

    /**
     * GET /me — Return current authenticated user data
     */
    public function me()
    {
        header('Content-Type: application/json');

        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'data' => null, 'message' => 'Chưa đăng nhập']);
            return;
        }

        $userModel     = new UserModel();
        $contractModel = new ContractModel();
        $payrollModel  = new PayrollModel();

        $user     = $userModel->findById($_SESSION['user_id']);
        $contract = $contractModel->findByUserId($_SESSION['user_id']);
        $payroll  = $payrollModel->getItemsByUserId($_SESSION['user_id']);
        $period   = $payrollModel->getCurrentPeriod();

        if (!$user) {
            http_response_code(404);
            echo json_encode(['success' => false, 'data' => null, 'message' => 'Không tìm thấy người dùng']);
            return;
        }

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data'    => [
                'user'           => $user,
                'contract'       => $contract ?: null,
                'payroll_history' => $payroll,
                'current_period' => $period ?: null,
            ],
            'message' => 'Lấy thông tin thành công',
        ]);
    }

    /**
     * POST/GET /logout — Destroy session
     */
    public function logout()
    {
        header('Content-Type: application/json');

        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(), '', time() - 42000,
                $params['path'], $params['domain'],
                $params['secure'], $params['httponly']
            );
        }

        session_destroy();

        http_response_code(200);
        echo json_encode(['success' => true, 'data' => null, 'message' => 'Đăng xuất thành công']);
    }
}

