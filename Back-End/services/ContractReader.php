<?php

require_once __DIR__ . '/ContractSchema.php';

class ContractReadException extends RuntimeException
{
}

/**
 * Đọc hợp đồng mềm .docx đã điền → mảng [key => giá trị thô].
 * Hỗ trợ 2 cách trình bày: bảng 2 cột "nhãn | giá trị" (mẫu PeopleOS) và dòng "Nhãn: giá trị".
 */
class ContractReader
{
    private const MAX_XML_BYTES = 5 * 1024 * 1024;

    public static function readDocx(string $path): array
    {
        $zip = new ZipArchive();
        if ($zip->open($path, ZipArchive::RDONLY) !== true) {
            throw new ContractReadException('File không phải định dạng .docx hợp lệ');
        }
        $stat = $zip->statName('word/document.xml');
        if ($stat === false) {
            $zip->close();
            throw new ContractReadException('File .docx không có nội dung văn bản (word/document.xml)');
        }
        if ($stat['size'] > self::MAX_XML_BYTES) {
            $zip->close();
            throw new ContractReadException('Nội dung hợp đồng quá lớn');
        }
        $xml = $zip->getFromName('word/document.xml');
        $zip->close();
        if ($xml === false || $xml === '') {
            throw new ContractReadException('Không đọc được nội dung hợp đồng');
        }

        $dom = new DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $ok = $dom->loadXML($xml, LIBXML_NONET | LIBXML_COMPACT);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);
        if (!$ok) {
            throw new ContractReadException('Nội dung hợp đồng bị lỗi định dạng');
        }

        $xp = new DOMXPath($dom);
        $xp->registerNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main');
        $index = ContractSchema::labelIndex();
        $values = [];
        $unknownRows = 0;

        foreach ($xp->query('//w:tr') as $tr) {
            $cells = $xp->query('./w:tc', $tr);
            if ($cells->length < 2) {
                continue;
            }
            $labelParas = $xp->query('.//w:p', $cells->item(0));
            $label = $labelParas->length ? self::text($xp, $labelParas->item(0)) : '';
            $key = self::match($label, $index);
            if ($key === null) {
                $unknownRows++;
                continue;
            }
            $lines = [];
            foreach ($xp->query('.//w:p', $cells->item(1)) as $p) {
                $t = trim(self::text($xp, $p));
                if ($t !== '') {
                    $lines[] = $t;
                }
            }
            $values[$key] = trim(implode("\n", $lines));
        }

        // Dạng "Nhãn: giá trị" cho văn bản không dùng bảng.
        foreach ($xp->query('//w:body/w:p') as $p) {
            $line = trim(self::text($xp, $p));
            if (!str_contains($line, ':')) {
                continue;
            }
            [$label, $value] = array_map('trim', explode(':', $line, 2));
            $key = self::match($label, $index);
            if ($key !== null && !isset($values[$key]) && $value !== '' && !preg_match('/^[.…_\s]+$/u', $value)) {
                $values[$key] = $value;
            }
        }

        // Bỏ các giá trị chỉ là dấu chấm/gạch giữ chỗ.
        foreach ($values as $k => $v) {
            if (preg_match('/^[.…_\-\s]*$/u', $v)) {
                $values[$k] = '';
            }
        }

        if ($values === []) {
            throw new ContractReadException('Không tìm thấy trường thông tin nào — hãy dùng đúng file mẫu hợp đồng PeopleOS');
        }
        return $values;
    }

    private static function match(string $label, array $index): ?string
    {
        $norm = ContractSchema::normalizeLabel($label);
        if ($norm === '') {
            return null;
        }
        if (isset($index[$norm])) {
            return $index[$norm];
        }
        // Cho phép nhãn bị thêm chữ phía sau (VD "Số CCCD/CMND").
        foreach ($index as $known => $key) {
            if (str_starts_with($norm, $known . ' ') || $norm === $known) {
                return $key;
            }
        }
        return null;
    }

    private static function text(DOMXPath $xp, DOMNode $node): string
    {
        $out = '';
        foreach ($xp->query('.//w:t|.//w:tab|.//w:br', $node) as $t) {
            $out .= $t->localName === 't' ? $t->textContent : ' ';
        }
        return $out;
    }
}
