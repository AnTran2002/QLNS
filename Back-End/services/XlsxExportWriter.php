<?php

class XlsxExportWriter
{
    public function write(string $path, array $headers, array $rows): void
    {
        if (!class_exists('ZipArchive')) {
            throw new RuntimeException('Backend cần bật PHP extension zip để xuất file .xlsx');
        }

        $zip = new ZipArchive();
        if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Không thể tạo file Excel');
        }

        try {
            $this->addPart($zip, '[Content_Types].xml', $this->contentTypes());
            $this->addPart($zip, '_rels/.rels', $this->rootRelationships());
            $this->addPart($zip, 'xl/workbook.xml', $this->workbook());
            $this->addPart($zip, 'xl/_rels/workbook.xml.rels', $this->workbookRelationships());
            $this->addPart($zip, 'xl/worksheets/sheet1.xml', $this->worksheet($headers, $rows));
        } catch (Throwable $e) {
            $zip->close();
            throw $e;
        }

        if (!$zip->close()) {
            throw new RuntimeException('Không thể hoàn tất file Excel');
        }
    }

    private function addPart(ZipArchive $zip, string $name, string $contents): void
    {
        if (!$zip->addFromString($name, $contents)) {
            throw new RuntimeException("Không thể ghi thành phần Excel: {$name}");
        }
    }

    private function worksheet(array $headers, array $rows): string
    {
        $xmlRows = [];
        $xmlRows[] = $this->rowXml(1, $headers);
        foreach ($rows as $index => $row) {
            $xmlRows[] = $this->rowXml($index + 2, $row);
        }

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<sheetData>' . implode('', $xmlRows) . '</sheetData></worksheet>';
    }

    private function rowXml(int $rowNumber, array $values): string
    {
        $cells = [];
        foreach (array_values($values) as $index => $value) {
            $reference = $this->columnName($index + 1) . $rowNumber;
            if (is_int($value) || is_float($value)) {
                if (!is_finite((float) $value)) {
                    throw new UnexpectedValueException('Không thể xuất giá trị số không hợp lệ vào Excel');
                }
                $cells[] = '<c r="' . $reference . '" t="n"><v>' . (string) $value . '</v></c>';
                continue;
            }

            $text = htmlspecialchars((string) $value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
            $cells[] = '<c r="' . $reference . '" t="inlineStr"><is><t xml:space="preserve">'
                . $text . '</t></is></c>';
        }

        return '<row r="' . $rowNumber . '">' . implode('', $cells) . '</row>';
    }

    private function columnName(int $number): string
    {
        $name = '';
        while ($number > 0) {
            $remainder = ($number - 1) % 26;
            $name = chr(65 + $remainder) . $name;
            $number = intdiv($number - 1, 26);
        }
        return $name;
    }

    private function contentTypes(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            . '<Default Extension="xml" ContentType="application/xml"/>'
            . '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            . '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            . '</Types>';
    }

    private function rootRelationships(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            . '</Relationships>';
    }

    private function workbook(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
            . ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            . '<sheets><sheet name="Bank Transfers" sheetId="1" r:id="rId1"/></sheets>'
            . '</workbook>';
    }

    private function workbookRelationships(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            . '</Relationships>';
    }
}
