/** Client-side CSV / Excel export (no backend required). */

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const body = [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')
  // BOM so Excel opens UTF-8 correctly.
  download(filename, '﻿' + body, 'text/csv;charset=utf-8')
}

/** Excel 2003 XML spreadsheet — opens natively in Excel, LibreOffice and Numbers. */
export function exportExcel(filename: string, sheet: string, header: string[], rows: (string | number)[][]) {
  const x = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const cell = (v: string | number) =>
    typeof v === 'number' ? `<Cell><Data ss:Type="Number">${v}</Data></Cell>` : `<Cell><Data ss:Type="String">${x(v)}</Data></Cell>`
  const xml =
    `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>` +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">` +
    `<Styles><Style ss:ID="h"><Font ss:Bold="1"/></Style></Styles>` +
    `<Worksheet ss:Name="${x(sheet)}"><Table>` +
    `<Row>${header.map((h) => `<Cell ss:StyleID="h"><Data ss:Type="String">${x(h)}</Data></Cell>`).join('')}</Row>` +
    rows.map((r) => `<Row>${r.map(cell).join('')}</Row>`).join('') +
    `</Table></Worksheet></Workbook>`
  download(filename, xml, 'application/vnd.ms-excel')
}
