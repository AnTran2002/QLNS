<?php

final class PayrollChangePolicy
{
    public static function validateReason($value): array
    {
        if (!is_string($value)) {
            return ['Lý do cần cụ thể, từ 10 đến 500 ký tự', null];
        }

        $reason = trim($value);
        $length = mb_strlen($reason);
        if ($length < 10 || $length > 500) {
            return ['Lý do cần cụ thể, từ 10 đến 500 ký tự', null];
        }

        return [null, $reason];
    }
}
