type ExportValue = string | number | boolean | undefined

function safeSpreadsheetText(value: ExportValue): string {
  if (value === undefined) return ''
  const text = String(value)
  return typeof value === 'string' && /^[=+\-@]/.test(text) ? `'${text}` : text
}

function csvCell(value: ExportValue): string {
  const text = safeSpreadsheetText(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: readonly (readonly ExportValue[])[]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

function xml(value: ExportValue): string {
  return safeSpreadsheetText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function spreadsheetCell(value: ExportValue): string {
  const type = typeof value === 'number' ? 'Number' : 'String'
  return `<Cell><Data ss:Type="${type}">${xml(value)}</Data></Cell>`
}

export function toSpreadsheetXml(
  columns: readonly string[],
  rows: readonly (readonly ExportValue[])[],
  sheetName: string,
): string {
  const header = `<Row ss:StyleID="Header">${columns.map(spreadsheetCell).join('')}</Row>`
  const body = rows.map((row) => `<Row>${row.map(spreadsheetCell).join('')}</Row>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Bottom"/></Style>
  <Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#E8EAF6" ss:Pattern="Solid"/></Style>
 </Styles>
 <Worksheet ss:Name="${xml(sheetName)}">
  <Table>${header}${body}</Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane></WorksheetOptions>
 </Worksheet>
</Workbook>`
}

export function datedExportFilename(prefix: string, today: string, extension: 'csv' | 'xls'): string {
  return `${prefix}-${today}.${extension}`
}
