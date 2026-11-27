<?php

require_once __DIR__ . '/ContractReader.php';
require_once __DIR__ . '/ContractValidator.php';

class ContractIntakeException extends RuntimeException
{
    public function __construct(string $message, public readonly int $status = 422, public readonly ?array $payload = null)
    {
        parent::__construct($message);
    }
}

/**
 * Nhận file hợp đồng tải lên: kiểm tra định dạng → đọc .docx → kiểm tra pháp lý → lưu file + bản ghi contract_documents.
 * Dùng chung cho ứng viên (qua link hợp đồng) và nhân sự (tải lên trực tiếp).
 */
class ContractIntake
{
    public const MAX_DOCX_BYTES = 5 * 1024 * 1024;
    public const MAX_SCAN_BYTES = 10 * 1024 * 1024;
    private const DOCX_MIME = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/octet-stream'];
    private const SCAN_MIME = ['application/pdf' => 'pdf', 'image/jpeg' => 'jpg', 'image/png' => 'png'];

    public static function storageDir(): string
    {
        $dir = PATH_ASSETS_UPLOADS . 'contracts/';
        if (!is_dir($dir)) {
            mkdir($dir, 0750, true);
            file_put_contents($dir . '.htaccess', "Require all denied\n");
        }
        return $dir;
    }

    /**
     * @return array [document_id, validation, dữ liệu đã chuẩn hoá]
     * @throws ContractIntakeException
     */
    public static function handle(?array $docx, ?array $scan, string $source, ?int $applicationId, ?int $uploadedBy, array $expect = []): array
    {
        if (!$docx || ($docx['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            throw new ContractIntakeException('Chưa chọn file hợp đồng (.docx)');
        }
        self::assertUploaded($docx, self::MAX_DOCX_BYTES, 'File hợp đồng');
        if (!preg_match('/\.docx$/i', $docx['name'])) {
            throw new ContractIntakeException('Hợp đồng mềm phải là file .docx (dùng mẫu tải về từ hệ thống)');
        }
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($docx['tmp_name']);
        if (!in_array($mime, self::DOCX_MIME, true)) {
            throw new ContractIntakeException('File hợp đồng không đúng định dạng .docx');
        }

        $scanExt = null;
        if ($scan && ($scan['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
            $scanExt = self::scanExtension($scan);
        } else {
            $scan = null;
        }

        try {
            $raw = ContractReader::readDocx($docx['tmp_name']);
        } catch (ContractReadException $e) {
            throw new ContractIntakeException($e->getMessage());
        }

        $result = (new ContractValidator())->validate($raw, $expect);
        $validation = self::summary($result);
        if (!$result['ok']) {
            throw new ContractIntakeException(
                'Hợp đồng bị từ chối: ' . count($result['errors']) . ' nội dung vi phạm quy định hoặc sai thông tin',
                422,
                ['validation' => $validation, 'extracted' => $result['data']]
            );
        }

        $hash = hash_file('sha256', $docx['tmp_name']);
        $model = new ContractDocumentModel();
        $dup = $model->findActiveByHash($hash);
        if ($dup) {
            throw new ContractIntakeException('File hợp đồng này đã được tải lên trước đó (hồ sơ #' . $dup['id'] . ')', 409);
        }

        $dir = self::storageDir();
        $stored = bin2hex(random_bytes(16)) . '.docx';
        if (!move_uploaded_file($docx['tmp_name'], $dir . $stored)) {
            throw new ContractIntakeException('Không lưu được file hợp đồng', 500);
        }
        $scanName = $scanPath = null;
        if ($scan) {
            $scanPath = bin2hex(random_bytes(16)) . '.' . $scanExt;
            if (!move_uploaded_file($scan['tmp_name'], $dir . $scanPath)) {
                @unlink($dir . $stored);
                throw new ContractIntakeException('Không lưu được bản scan', 500);
            }
            $scanName = self::safeName($scan['name']);
        }

        $id = $model->create([
            'application_id' => $applicationId,
            'contract_number' => $result['data']['contract_number'],
            'source' => $source,
            'original_filename' => self::safeName($docx['name']),
            'stored_path' => $stored,
            'file_hash' => $hash,
            'scan_filename' => $scanName,
            'scan_path' => $scanPath,
            'extracted_data' => json_encode(['raw' => $raw, 'data' => $result['data']], JSON_UNESCAPED_UNICODE),
            'validation' => json_encode($validation, JSON_UNESCAPED_UNICODE),
            'uploaded_by' => $uploadedBy,
        ]);
        return [$id, $validation, $result['data']];
    }

    /** Lưu bản scan bổ sung cho hồ sơ đã có. Trả về [tên gốc, đường dẫn lưu]. */
    public static function storeScan(array $scan): array
    {
        $ext = self::scanExtension($scan);
        $path = bin2hex(random_bytes(16)) . '.' . $ext;
        if (!move_uploaded_file($scan['tmp_name'], self::storageDir() . $path)) {
            throw new ContractIntakeException('Không lưu được bản scan', 500);
        }
        return [self::safeName($scan['name']), $path];
    }

    public static function summary(array $result): array
    {
        return [
            'missing' => $result['missing'],
            'errors' => $result['errors'],
            'warnings' => $result['warnings'],
            'ok' => $result['ok'],
            'complete' => $result['complete'],
            'checked_at' => date('Y-m-d H:i:s'),
        ];
    }

    private static function scanExtension(array $scan): string
    {
        self::assertUploaded($scan, self::MAX_SCAN_BYTES, 'Bản scan');
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($scan['tmp_name']);
        if (!isset(self::SCAN_MIME[$mime])) {
            throw new ContractIntakeException('Bản scan phải là PDF, JPG hoặc PNG');
        }
        return self::SCAN_MIME[$mime];
    }

    private static function assertUploaded(array $file, int $max, string $label): void
    {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
            throw new ContractIntakeException("{$label} tải lên không thành công");
        }
        if ($file['size'] > $max) {
            throw new ContractIntakeException("{$label} vượt quá " . ($max / 1024 / 1024) . 'MB');
        }
    }

    private static function safeName(string $name): string
    {
        $name = preg_replace('/[^\p{L}\p{N}._ -]+/u', '_', basename($name));
        return mb_substr($name, 0, 200);
    }
}
