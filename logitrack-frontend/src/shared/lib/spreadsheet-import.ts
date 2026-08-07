/** Leitura dos formatos oferecidos pelo modelo de importação: CSV e SpreadsheetML. */

type SheetRow = readonly string[]

export class SpreadsheetImportError extends Error {
  constructor(readonly reason: 'unsupported' | 'empty' | 'malformed') {
    super(reason)
    this.name = 'SpreadsheetImportError'
  }
}

/** CSV com aspas, quebras de linha em células e detecção de `,` ou `;`. */
export function parseCsv(text: string): SheetRow[] {
  const content = text.replace(/^﻿/, '')
  const separator = pickSeparator(content)
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]

    if (quoted) {
      if (char === '"') {
        // Aspa dupla dentro de campo entre aspas representa uma aspa literal.
        if (content[index + 1] === '"') {
          cell += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        cell += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
    } else if (char === separator) {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else if (char !== '\r') {
      cell += char
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  return rows.filter((line) => line.some((value) => value.trim() !== ''))
}

function pickSeparator(content: string): string {
  let commas = 0
  let semicolons = 0
  let quoted = false
  for (const char of content) {
    if (char === '"') quoted = !quoted
    else if (!quoted && char === ',') commas += 1
    else if (!quoted && char === ';') semicolons += 1
  }
  return semicolons > commas ? ';' : ','
}

/** SpreadsheetML (o `.xls` que este projeto exporta) via DOMParser. */
function parseSpreadsheetXml(text: string): SheetRow[] {
  const document = new DOMParser().parseFromString(text, 'application/xml')
  if (document.querySelector('parsererror')) {
    throw new SpreadsheetImportError('malformed')
  }

  const rows = Array.from(document.getElementsByTagName('Row'))
  if (rows.length === 0) throw new SpreadsheetImportError('malformed')

  return rows
    .map((rowNode) => Array.from(rowNode.getElementsByTagName('Cell'))
      .map((cellNode) => cellNode.getElementsByTagName('Data')[0]?.textContent?.trim() ?? ''))
    .filter((line) => line.some((value) => value !== ''))
}

/** Escolhe o parser pela extensão e pelo conteúdo; erro explícito no resto. */
export function parseSpreadsheet(fileName: string, text: string): SheetRow[] {
  const lower = fileName.toLowerCase()

  if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    const rows = parseCsv(text)
    if (rows.length === 0) throw new SpreadsheetImportError('empty')
    return rows
  }

  if (lower.endsWith('.xls') || lower.endsWith('.xml')) {
    // Um .xlsx renomeado para .xls chega aqui como binário de ZIP ("PK").
    if (text.startsWith('PK')) throw new SpreadsheetImportError('unsupported')
    const rows = parseSpreadsheetXml(text)
    if (rows.length === 0) throw new SpreadsheetImportError('empty')
    return rows
  }

  throw new SpreadsheetImportError('unsupported')
}

/** Descarta o cabeçalho pelo conteúdo sem perder a primeira linha de arquivos sem cabeçalho. */
export function dropHeaderRow(rows: SheetRow[], headerHints: readonly string[]): SheetRow[] {
  const [first] = rows
  if (!first) return rows

  const normalized = first.map((cell) => cell.trim().toLowerCase())
  const looksLikeHeader = headerHints.some((hint) =>
    normalized.some((cell) => cell.includes(hint)))

  return looksLikeHeader ? rows.slice(1) : rows
}

/** Número em formato brasileiro ("1.234,56") ou inglês ("1234.56"). */
export function parseSheetNumber(value: string): number {
  const cleaned = value.trim().replace(/\s/g, '')
  if (!cleaned) return Number.NaN

  // Se há vírgula E ponto, o último separador é o decimal.
  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')

  if (lastComma > lastDot) {
    return Number(cleaned.replace(/\./g, '').replace(',', '.'))
  }
  if (lastDot > lastComma) {
    return Number(cleaned.replace(/,/g, ''))
  }
  return Number(cleaned.replace(',', '.'))
}
