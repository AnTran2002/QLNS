<?php

require_once __DIR__ . '/../services/LeavePolicy.php';

/**
 * Nghỉ phép: nhân viên gửi / huỷ đơn, quản trị duyệt / từ chối.
 */
class LeaveController
{
    private const MIGRATION_HINT = 'Chưa có bảng leave_requests — hãy chạy migration 005_leave_requests.sql';

    /** GET ?action=employee/leave — quỹ phép năm + danh sách đơn của người đang đăng nhập. */
    public function mine()
    {
        if (!require_auth()) {
            return;
        }
        $model = new LeaveRequestModel();
        $year  = (int) date('Y');
        if (!$model->tableExists()) {
            return json_response(200, ['available' => false, 'balance' => null, 'requests' => []], self::MIGRATION_HINT);
        }
        $userId = (int) $_SESSION['user_id'];
        json_response(200, [
            'available' => true,
            'balance'   => $this->balance($model, $userId, $year),
            'requests'  => array_map([$this, 'present'], $model->findByUser($userId)),
        ], 'Lấy danh sách đơn nghỉ thành công');
    }

    /** POST ?action=employee/leave — body { type, start_date, end_date, reason }. */
    public function store()
    {
        if (!require_method('POST') || !require_auth()) {
            return;
        }
        $model = new LeaveRequestModel();
        if (!$model->tableExists()) {
            return json_response(409, null, self::MIGRATION_HINT);
        }
        $input = read_json_body();
        if ($input === null) {
            return json_response(422, null, 'Dữ liệu gửi lên phải là JSON');
        }

        [$error, $days] = LeavePolicy::validate($input);
        if ($error) {
            return json_response(422, null, $error);
        }

        if ($input['type'] === 'OTHER') {
            $event = LeavePolicy::PERSONAL_PAID_EVENTS[$input['personal_event']];
            $input['reason'] = $event['label'] . ' — ' . trim($input['reason']);
        }

        $userId = (int) $_SESSION['user_id'];
        if ($model->hasOverlap($userId, $input['start_date'], $input['end_date'])) {
            return json_response(409, null, 'Khoảng ngày này trùng với một đơn khác đang chờ duyệt hoặc đã duyệt');
        }
        if ($input['type'] === 'ANNUAL') {
            $balance = $this->balance($model, $userId, (int) substr($input['start_date'], 0, 4));
            if (count($days) > $balance['remaining']) {
                return json_response(422, null, sprintf(
                    'Vượt quỹ phép năm: còn %s ngày (đã tính cả đơn đang chờ duyệt), đơn này cần %d ngày',
                    rtrim(rtrim(number_format($balance['remaining'], 1, ',', ''), '0'), ','),
                    count($days)
                ));
            }
        }

        $id = $model->create($userId, $input, count($days));
        json_response(201, $this->present($model->find($id)), 'Đã gửi đơn nghỉ — chờ quản trị duyệt');
    }

    /** POST ?action=employee/leave/cancel&id= — huỷ đơn của chính mình khi còn chờ duyệt. */
    public function cancel()
    {
        if (!require_method('POST') || !require_auth()) {
            return;
        }
        $model   = new LeaveRequestModel();
        $request = $this->findOr404($model);
        if (!$request) {
            return;
        }
        if ((int) $request['user_id'] !== (int) $_SESSION['user_id']) {
            return json_response(403, null, 'Bạn chỉ huỷ được đơn của chính mình');
        }
        if (!$model->setStatus((int) $request['id'], 'CANCELLED')) {
            return json_response(409, null, 'Đơn đã được xử lý, không thể huỷ');
        }
        json_response(200, $this->present($model->find((int) $request['id'])), 'Đã huỷ đơn nghỉ');
    }

    /** GET ?action=leave/requests[&status=PENDING] — mọi đơn (ADMIN). */
    public function index()
    {
        if (!require_auth('ADMIN')) {
            return;
        }
        $model = new LeaveRequestModel();
        if (!$model->tableExists()) {
            return json_response(200, ['available' => false, 'requests' => []], self::MIGRATION_HINT);
        }
        $status = $_GET['status'] ?? null;
        if ($status !== null && !in_array($status, LeavePolicy::STATUSES, true)) {
            $status = null;
        }
        json_response(200, [
            'available' => true,
            'requests'  => array_map([$this, 'present'], $model->findAll($status)),
        ], 'Lấy danh sách đơn nghỉ thành công');
    }

    /** POST ?action=leave/review&id= — body { decision: APPROVED|REJECTED, note? } (ADMIN). */
    public function review()
    {
        if (!require_method('POST') || !require_auth('ADMIN')) {
            return;
        }
        $input    = read_json_body() ?? [];
        $decision = $input['decision'] ?? '';
        $note     = trim((string) ($input['note'] ?? ''));
        if (!in_array($decision, ['APPROVED', 'REJECTED'], true)) {
            return json_response(422, null, 'decision phải là APPROVED hoặc REJECTED');
        }
        if ($decision === 'REJECTED' && mb_strlen($note) < 3) {
            return json_response(422, null, 'Hãy ghi lý do từ chối (ít nhất 3 ký tự)');
        }
        if (mb_strlen($note) > 500) {
            return json_response(422, null, 'Ghi chú tối đa 500 ký tự');
        }

        $model   = new LeaveRequestModel();
        $request = $this->findOr404($model);
        if (!$request) {
            return;
        }

        $model->beginTransaction();
        try {
            if (!$model->setStatus((int) $request['id'], $decision, (int) $_SESSION['user_id'], $note !== '' ? $note : null)) {
                $model->rollBack();
                return json_response(409, null, 'Đơn đã được xử lý trước đó');
            }
            if ($decision === 'APPROVED') {
                $label = LeavePolicy::TYPES[$request['type']] ?? 'Nghỉ phép';
                $model->markAttendance(
                    (int) $request['user_id'],
                    LeavePolicy::workdays($request['start_date'], $request['end_date']),
                    mb_substr("{$label}: {$request['reason']}", 0, 255)
                );
            }
            $model->commit();
            (new NotificationModel())->createForUser(
                (int) $request['user_id'],
                'LEAVE_REVIEW',
                $decision === 'APPROVED' ? 'Đơn nghỉ phép đã được duyệt' : 'Đơn nghỉ phép đã bị từ chối',
                $decision === 'APPROVED'
                    ? "Đơn nghỉ từ {$request['start_date']} đến {$request['end_date']} đã được duyệt."
                    : "Đơn nghỉ từ {$request['start_date']} đến {$request['end_date']} đã bị từ chối." . ($note !== '' ? " Ghi chú: {$note}" : ''),
                '/nhan-vien/nghi-phep'
            );
        } catch (Throwable $e) {
            $model->rollBack();
            throw $e;
        }

        json_response(200, $this->present($model->find((int) $request['id'])),
            $decision === 'APPROVED' ? 'Đã duyệt đơn nghỉ' : 'Đã từ chối đơn nghỉ');
    }

    /* ------------------------------------------------------------------ */

    private function balance(LeaveRequestModel $model, int $userId, int $year): array
    {
        $user  = (new UserModel())->findById($userId);
        $quota = LeavePolicy::annualQuota($user['joined_at'] ?? null, $year);
        $usage = $model->annualUsage($userId, $year);
        return [
            'year'      => $year,
            'quota'     => $quota,
            'used'      => $usage['used'],
            'pending'   => $usage['pending'],
            'remaining' => max(0, $quota - $usage['used'] - $usage['pending']),
        ];
    }

    private function findOr404(LeaveRequestModel $model): ?array
    {
        if (!$model->tableExists()) {
            json_response(409, null, self::MIGRATION_HINT);
            return null;
        }
        $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $request = $id ? $model->find($id) : null;
        if (!$request) {
            json_response(404, null, 'Không tìm thấy đơn nghỉ');
            return null;
        }
        return $request;
    }

    private function present(array $r): array
    {
        return [
            'id'            => (int) $r['id'],
            'user_id'       => (int) $r['user_id'],
            'employee_code' => $r['employee_code'],
            'full_name'     => $r['full_name'],
            'department'    => $r['department'],
            'position'      => $r['position'],
            'avatar'        => $r['avatar'] ?? null,
            'type'          => $r['type'],
            'start_date'    => $r['start_date'],
            'end_date'      => $r['end_date'],
            'days'          => (float) $r['days'],
            'reason'        => $r['reason'],
            'status'        => $r['status'],
            'review_note'   => $r['review_note'],
            'reviewer_name' => $r['reviewer_name'],
            'reviewed_at'   => $r['reviewed_at'],
            'created_at'    => $r['created_at'],
        ];
    }
}
