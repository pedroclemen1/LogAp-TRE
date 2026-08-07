import { describe, expect, it } from 'vitest'
import { datedExportFilename, toCsv, toSpreadsheetXml } from './export-serialization'

describe('export serialization', () => {
  it('quotes CSV delimiters and escapes quotes', () => {
    expect(toCsv([['plate', 'description'], ['ABC1D23', 'Oil, "filter"']]))
      .toBe('plate,description\r\nABC1D23,"Oil, ""filter"""\r\n')
  })

  it.each(['=SUM(A1:A2)', '+1+1', '-2+3', '@command'])('neutralizes spreadsheet formula %s', (formula) => {
    expect(toCsv([[formula]])).toBe(`'${formula}\r\n`)
    expect(toSpreadsheetXml(['value'], [[formula]], 'Sheet')).toContain(`&apos;${formula}`)
  })

  it('keeps numeric values numeric in spreadsheet XML', () => {
    expect(toSpreadsheetXml(['cost'], [[-42.5]], 'Costs'))
      .toContain('<Data ss:Type="Number">-42.5</Data>')
  })

  it('escapes XML data and worksheet names', () => {
    const xml = toSpreadsheetXml(['service'], [['Oil & <filter>']], 'Fleet "A"')
    expect(xml).toContain('Oil &amp; &lt;filter&gt;')
    expect(xml).toContain('ss:Name="Fleet &quot;A&quot;"')
  })

  it('builds dated filenames', () => {
    expect(datedExportFilename('fleet', '2026-08-07', 'csv')).toBe('fleet-2026-08-07.csv')
  })
})
