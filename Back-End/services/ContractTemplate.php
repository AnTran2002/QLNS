<?php

require_once __DIR__ . '/ContractSchema.php';
require_once __DIR__ . '/PayrollConfig.php';

/**
 * Sinh file mẫu hợp đồng lao động .docx (Office Open XML thuần, không cần thư viện ngoài).
 * Mỗi mục là một bảng 2 cột "Nội dung | Thông tin" — người dùng điền cột phải, hệ thống đọc lại theo nhãn cột trái.
 */
class ContractTemplate
{
    /** @return string nội dung nhị phân của file .docx */
    public static function build(array $prefill = []): string
    {
        $body = '';
        $c = ContractSchema::COMPANY;
        $body .= self::para('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', true, 'center', 26);
        $body .= self::para('Độc lập – Tự do – Hạnh phúc', true, 'center', 24);
        $body .= self::para('');
        $body .= self::para('HỢP ĐỒNG LAO ĐỘNG', true, 'center', 32);
        $body .= self::para('Căn cứ Bộ luật Lao động số 45/2019/QH14; Luật Bảo hiểm xã hội số 41/2024/QH15; Nghị định 293/2025/NĐ-CP về lương tối thiểu vùng.', false, 'both', 20, true);
        $body .= self::para('');
        $body .= self::para('BÊN A – NGƯỜI SỬ DỤNG LAO ĐỘNG', true);
        $body .= self::para('Tên đơn vị: ' . $c['name']);
        $body .= self::para('Mã số thuế: ' . $c['tax_code'] . '   ·   Điện thoại: ' . $c['phone']);
        $body .= self::para('Địa chỉ: ' . $c['address']);
        $body .= self::para('Đại diện: ' . $c['representative'] . ' – ' . $c['representative_title']);
        $body .= self::para('');
        $body .= self::para('HƯỚNG DẪN: Điền thông tin vào CỘT BÊN PHẢI của các bảng dưới đây. Không sửa nội dung cột bên trái. Các dòng có dấu (*) là bắt buộc. Ngày ghi theo dạng dd/mm/yyyy, số tiền ghi bằng số (VD: 15.000.000).', false, 'both', 18, true);

        $fieldsBySection = [];
        foreach (ContractSchema::fields() as $key => $def) {
            $fieldsBySection[$def[1]][$key] = $def;
        }
        foreach (ContractSchema::sections() as $section => $title) {
            $body .= self::para('');
            $body .= self::para($title, true, 'left', 24);
            $rows = '';
            foreach ($fieldsBySection[$section] ?? [] as $key => [$label, , $required, , $hint]) {
                $value = isset($prefill[$key]) ? (string) $prefill[$key] : '';
                $rows .= self::row($label . ($required ? ' (*)' : ''), $value, $hint);
            }
            $body .= self::table($rows);
            if ($section === 'salary') {
                $body .= self::para('Bên A đóng BHXH 17,5%, BHYT 3%, BHTN 1% trên lương đóng BHXH; Bên B đóng BHXH 8%, BHYT 1,5%, BHTN 1% (khấu trừ vào lương). Làm thêm giờ được trả tối thiểu 150% (ngày thường), 200% (ngày nghỉ hằng tuần), 300% (ngày lễ, Tết) theo Điều 98 BLLĐ 2019.', false, 'both', 18, true);
            }
        }

        $body .= self::para('');
        $body .= self::para('VI. ĐIỀU KHOẢN CHUNG', true, 'left', 24);
        foreach ([
            'Bên B được hưởng đầy đủ các chế độ nghỉ lễ, Tết (Điều 112), nghỉ hằng năm (Điều 113) và các quyền lợi theo pháp luật lao động.',
            'Hai bên thực hiện quyền đơn phương chấm dứt hợp đồng theo Điều 35, Điều 36 BLLĐ 2019 và thời hạn báo trước tương ứng.',
            'Những vấn đề chưa ghi trong hợp đồng này được áp dụng theo nội quy lao động, thỏa ước lao động tập thể và quy định của pháp luật.',
            'Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản. Bản mềm (.docx) dùng để hệ thống PeopleOS đọc dữ liệu; bản scan có chữ ký là bản đối chiếu.',
        ] as $i => $text) {
            $body .= self::para(($i + 1) . '. ' . $text, false, 'both', 20);
        }
        $body .= self::para('');
        $body .= self::para('NGƯỜI LAO ĐỘNG                                                    NGƯỜI SỬ DỤNG LAO ĐỘNG', true, 'center');
        $body .= self::para('(Ký, ghi rõ họ tên)                                                    (Ký, đóng dấu)', false, 'center', 18, true);

        $document = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            . '<w:body>' . $body
            . '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1418" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>'
            . '</w:body></w:document>';

        $tmp = tempnam(sys_get_temp_dir(), 'hdld');
        $zip = new ZipArchive();
        $zip->open($tmp, ZipArchive::OVERWRITE);
        $zip->addFromString('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            . '<Default Extension="xml" ContentType="application/xml"/>'
            . '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
            . '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
            . '</Types>');
        $zip->addFromString('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
            . '</Relationships>');
        $zip->addFromString('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            . '</Relationships>');
        $zip->addFromString('word/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            . '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault>'
            . '<w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'
            . '</w:styles>');
        $zip->addFromString('word/document.xml', $document);
        $zip->close();
        $bytes = file_get_contents($tmp);
        unlink($tmp);
        return $bytes;
    }

    private static function esc(string $s): string
    {
        return htmlspecialchars($s, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }

    private static function run(string $text, bool $bold = false, int $size = 24, bool $italic = false, string $color = ''): string
    {
        $rpr = ($bold ? '<w:b/>' : '') . ($italic ? '<w:i/>' : '') . ($color ? '<w:color w:val="' . $color . '"/>' : '') . '<w:sz w:val="' . $size . '"/>';
        return '<w:r><w:rPr>' . $rpr . '</w:rPr><w:t xml:space="preserve">' . self::esc($text) . '</w:t></w:r>';
    }

    private static function para(string $text, bool $bold = false, string $align = 'left', int $size = 24, bool $italic = false): string
    {
        return '<w:p><w:pPr><w:jc w:val="' . $align . '"/></w:pPr>' . ($text !== '' ? self::run($text, $bold, $size, $italic) : '') . '</w:p>';
    }

    private static function row(string $label, string $value, string $hint): string
    {
        $labelCell = '<w:tc><w:tcPr><w:tcW w:w="4200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr>'
            . '<w:p>' . self::run($label, true, 22) . '</w:p>'
            . ($hint !== '' ? '<w:p>' . self::run('Hướng dẫn: ' . $hint, false, 16, true, '777777') . '</w:p>' : '')
            . '</w:tc>';
        $valueCell = '<w:tc><w:tcPr><w:tcW w:w="5200" w:type="dxa"/></w:tcPr><w:p>' . ($value !== '' ? self::run($value, false, 22) : '') . '</w:p></w:tc>';
        return '<w:tr>' . $labelCell . $valueCell . '</w:tr>';
    }

    private static function table(string $rows): string
    {
        $border = '<w:top w:val="single" w:sz="4" w:color="BFBFBF"/><w:left w:val="single" w:sz="4" w:color="BFBFBF"/>'
            . '<w:bottom w:val="single" w:sz="4" w:color="BFBFBF"/><w:right w:val="single" w:sz="4" w:color="BFBFBF"/>'
            . '<w:insideH w:val="single" w:sz="4" w:color="BFBFBF"/><w:insideV w:val="single" w:sz="4" w:color="BFBFBF"/>';
        return '<w:tbl><w:tblPr><w:tblW w:w="9400" w:type="dxa"/><w:tblBorders>' . $border . '</w:tblBorders>'
            . '<w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr>'
            . '<w:tblGrid><w:gridCol w:w="4200"/><w:gridCol w:w="5200"/></w:tblGrid>' . $rows . '</w:tbl>';
    }
}
