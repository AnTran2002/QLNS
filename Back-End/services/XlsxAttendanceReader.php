<?php

class XlsxAttendanceReader
{
    private const MAX_UNCOMPRESSED_PART_SIZE = 20971520;
    private const MAX_ROWS = 10001;

    public function read(string $path): array
    {
        if (!class_exists('ZipArchive')) {
            throw new RuntimeException('Backend cần bật PHP extension zip để đọc file .xlsx');
        }

        $zip = new ZipArchive();
        if ($zip->open($path) !== true) {
            throw new UnexpectedValueException('File Excel không phải định dạng .xlsx hợp lệ');
        }

        try {
            $workbookXml = $this->readPart($zip, 'xl/workbook.xml');
            $relationshipsXml = $this->readPart($zip, 'xl/_rels/workbook.xml.rels');
            $sheetPath = $this->firstSheetPath($workbookXml, $relationshipsXml);
            $sharedStringsXml = $this->optionalPart($zip, 'xl/sharedStrings.xml');
            $sharedStrings = $sharedStringsXml === null ? [] : $this->readSharedStrings($sharedStringsXml);
            $sheetXml = $this->readPart($zip, $sheetPath);

            return $this->readRows($sheetXml, $sharedStrings);
        } finally {
            $zip->close();
        }
    }

    private function readPart(ZipArchive $zip, string $name): string
    {
        $stat = $zip->statName($name);
        if ($stat === false || $stat['size'] > self::MAX_UNCOMPRESSED_PART_SIZE) {
            throw new UnexpectedValueException("Thiếu hoặc vượt giới hạn dữ liệu trong file Excel: {$name}");
        }

        $contents = $zip->getFromName($name);
        if ($contents === false) {
            throw new UnexpectedValueException("Không đọc được dữ liệu trong file Excel: {$name}");
        }
        return $contents;
    }

    private function optionalPart(ZipArchive $zip, string $name): ?string
    {
        if ($zip->statName($name) === false) {
            return null;
        }
        return $this->readPart($zip, $name);
    }

    private function firstSheetPath(string $workbookXml, string $relationshipsXml): string
    {
        $workbook = $this->loadXml($workbookXml);
        $relationshipNamespace = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
        $sheets = $workbook->getElementsByTagNameNS(
            'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
            'sheet'
        );
        if ($sheets->length === 0) {
            throw new UnexpectedValueException('File Excel không có worksheet');
        }

        $relationshipId = $sheets->item(0)->getAttributeNS($relationshipNamespace, 'id');
        $relationships = $this->loadXml($relationshipsXml);
        foreach ($relationships->getElementsByTagName('Relationship') as $relationship) {
            if ($relationship->getAttribute('Id') !== $relationshipId) {
                continue;
            }

            $target = ltrim(str_replace('\\', '/', $relationship->getAttribute('Target')), '/');
            if (strpos($target, 'xl/') !== 0) {
                $target = 'xl/' . $target;
            }
            if (preg_match('#^xl/worksheets/[A-Za-z0-9_.-]+\.xml$#', $target) !== 1) {
                throw new UnexpectedValueException('Đường dẫn worksheet trong file Excel không hợp lệ');
            }
            return $target;
        }

        throw new UnexpectedValueException('Không xác định được worksheet đầu tiên trong file Excel');
    }

    private function readSharedStrings(string $xml): array
    {
        $document = $this->loadXml($xml);
        $strings = [];
        foreach ($document->getElementsByTagNameNS(
            'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
            'si'
        ) as $item) {
            $value = '';
            foreach ($item->getElementsByTagNameNS(
                'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
                't'
            ) as $text) {
                $value .= $text->textContent;
            }
            $strings[] = $value;
        }
        return $strings;
    }

    private function readRows(string $xml, array $sharedStrings): array
    {
        $document = $this->loadXml($xml);
        $rows = $document->getElementsByTagNameNS(
            'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
            'row'
        );
        if ($rows->length > self::MAX_ROWS) {
            throw new UnexpectedValueException('File Excel vượt quá giới hạn 10000 dòng');
        }

        $header = null;
        $columnIndexes = [];
        $records = [];
        foreach ($rows as $row) {
            $cells = [];
            foreach ($row->getElementsByTagNameNS(
                'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
                'c'
            ) as $cell) {
                $columnIndex = $this->columnIndex($cell->getAttribute('r'));
                $type = $cell->getAttribute('t');
                $valueNodes = $cell->getElementsByTagNameNS(
                    'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
                    'v'
                );

                if ($type === 'inlineStr') {
                    $value = '';
                    foreach ($cell->getElementsByTagNameNS(
                        'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
                        't'
                    ) as $text) {
                        $value .= $text->textContent;
                    }
                } elseif ($valueNodes->length > 0) {
                    $value = $valueNodes->item(0)->textContent;
                    if ($type === 's') {
                        $sharedStringIndex = filter_var($value, FILTER_VALIDATE_INT);
                        if ($sharedStringIndex === false || !array_key_exists($sharedStringIndex, $sharedStrings)) {
                            throw new UnexpectedValueException('File Excel có tham chiếu shared string không hợp lệ');
                        }
                        $value = $sharedStrings[$sharedStringIndex];
                    }
                } else {
                    $value = '';
                }
                $cells[$columnIndex] = trim((string) $value);
            }

            if ($cells === []) {
                continue;
            }
            ksort($cells);

            if ($header === null) {
                $columnIndexes = $this->parseHeader($cells);
                $header = true;
                continue;
            }

            $employeeCode = trim((string) ($cells[$columnIndexes['employee_code']] ?? ''));
            $actualDays = trim((string) ($cells[$columnIndexes['actual_days']] ?? ''));
            $otHours = trim((string) ($cells[$columnIndexes['ot_hours']] ?? ''));
            if ($employeeCode === '' && $actualDays === '' && $otHours === '') {
                continue;
            }

            $records[] = [
                'row_number' => (int) $row->getAttribute('r'),
                'employee_code' => $employeeCode,
                'actual_days' => $actualDays,
                'ot_hours' => $otHours,
            ];
        }

        if ($header === null) {
            throw new UnexpectedValueException('File Excel không có dòng tiêu đề');
        }
        if ($records === []) {
            throw new UnexpectedValueException('File Excel không có dữ liệu ngày công');
        }
        return $records;
    }

    private function parseHeader(array $cells): array
    {
        $aliases = [
            'employee_code' => ['employee_code', 'mã nhân viên', 'mã nv'],
            'actual_days' => ['actual_days', 'ngày công', 'số ngày công'],
            'ot_hours' => ['ot_hours', 'giờ ot', 'số giờ ot', 'ot giờ'],
        ];
        $indexes = [];

        foreach ($cells as $columnIndex => $value) {
            $normalized = mb_strtolower(preg_replace('/\s+/', ' ', trim($value)), 'UTF-8');
            foreach ($aliases as $field => $names) {
                if (in_array($normalized, $names, true)) {
                    if (isset($indexes[$field])) {
                        throw new UnexpectedValueException("File Excel có cột {$field} bị lặp");
                    }
                    $indexes[$field] = $columnIndex;
                }
            }
        }

        foreach (array_keys($aliases) as $field) {
            if (!isset($indexes[$field])) {
                throw new UnexpectedValueException(
                    'File Excel phải có đủ cột employee_code, actual_days, ot_hours (Mã nhân viên, Ngày công, Giờ OT)'
                );
            }
        }
        return $indexes;
    }

    private function columnIndex(string $cellReference): int
    {
        if (preg_match('/^([A-Z]+)\d+$/i', $cellReference, $matches) !== 1) {
            throw new UnexpectedValueException('File Excel có địa chỉ ô không hợp lệ');
        }

        $index = 0;
        foreach (str_split(strtoupper($matches[1])) as $letter) {
            $index = ($index * 26) + ord($letter) - ord('A') + 1;
        }
        return $index - 1;
    }

    private function loadXml(string $xml): DOMDocument
    {
        $document = new DOMDocument();
        $document->resolveExternals = false;
        $document->substituteEntities = false;
        $previousErrorMode = libxml_use_internal_errors(true);
        try {
            if (!$document->loadXML($xml, LIBXML_NONET | LIBXML_COMPACT)) {
                throw new UnexpectedValueException('File Excel chứa XML không hợp lệ');
            }
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($previousErrorMode);
        }
        return $document;
    }
}
