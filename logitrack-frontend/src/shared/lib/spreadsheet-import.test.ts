import { describe, expect, it } from 'vitest'
import {
  SpreadsheetImportError,
  dropHeaderRow,
  parseCsv,
  parseSheetNumber,
  parseSpreadsheet,
} from './spreadsheet-import'

describe('parseCsv', () => {
  it('lê linhas e colunas simples', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']])
  })

  it('respeita aspas com vírgula dentro', () => {
    expect(parseCsv('"Alfa, Ltda",10')).toEqual([['Alfa, Ltda', '10']])
  })

  it('trata aspa dupla escapada', () => {
    expect(parseCsv('"Diz ""oi""",1')).toEqual([['Diz "oi"', '1']])
  })

  it('aceita quebra de linha dentro de célula entre aspas', () => {
    expect(parseCsv('"linha1\nlinha2",x')).toEqual([['linha1\nlinha2', 'x']])
  })

  // Excel em português exporta com ponto e vírgula.
  it('detecta ponto e vírgula como separador', () => {
    expect(parseCsv('a;b;c\n1;2;3')).toEqual([['a', 'b', 'c'], ['1', '2', '3']])
  })

  it('não confunde ponto e vírgula dentro de aspas com separador', () => {
    expect(parseCsv('"a;b",c')).toEqual([['a;b', 'c']])
  })

  it('descarta linhas totalmente vazias', () => {
    expect(parseCsv('a,b\n\n,\n1,2')).toEqual([['a', 'b'], ['1', '2']])
  })

  it('remove BOM do início', () => {
    expect(parseCsv('﻿a,b')).toEqual([['a', 'b']])
  })

  it('aceita CRLF', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([['a', 'b'], ['1', '2']])
  })
})

describe('parseSpreadsheet', () => {
  it('recusa extensão não suportada', () => {
    expect(() => parseSpreadsheet('carga.xlsx', 'qualquer'))
      .toThrowError(SpreadsheetImportError)
  })

  /**
   * .xlsx é um ZIP; renomear para .xls não o torna legível. O parser precisa
   * dizer isso em vez de estourar um erro de XML incompreensível.
   */
  it('recusa .xlsx renomeado para .xls', () => {
    const zipMagicBytes = 'PKconteudo binario'
    expect(() => parseSpreadsheet('carga.xls', zipMagicBytes))
      .toThrowError(SpreadsheetImportError)
  })

  it('recusa arquivo vazio', () => {
    expect(() => parseSpreadsheet('carga.csv', '')).toThrowError(SpreadsheetImportError)
  })

  it('lê CSV pela extensão', () => {
    expect(parseSpreadsheet('carga.csv', 'NF-1,Alfa,2,10')).toEqual([['NF-1', 'Alfa', '2', '10']])
  })
})

describe('dropHeaderRow', () => {
  it('remove o cabeçalho quando reconhece um rótulo', () => {
    const rows = [['Nota Fiscal', 'Destinatário'], ['NF-1', 'Alfa']]
    expect(dropHeaderRow(rows, ['nota'])).toEqual([['NF-1', 'Alfa']])
  })

  /** Sem cabeçalho, descartar a primeira linha perderia um item de carga. */
  it('mantém a primeira linha quando não parece cabeçalho', () => {
    const rows = [['NF-1', 'Alfa'], ['NF-2', 'Beta']]
    expect(dropHeaderRow(rows, ['nota'])).toEqual(rows)
  })

  it('lida com lista vazia', () => {
    expect(dropHeaderRow([], ['nota'])).toEqual([])
  })
})

describe('parseSheetNumber', () => {
  it('lê formato inglês', () => {
    expect(parseSheetNumber('1234.56')).toBe(1234.56)
  })

  it('lê formato brasileiro', () => {
    expect(parseSheetNumber('1.234,56')).toBe(1234.56)
  })

  it('lê vírgula decimal sem milhar', () => {
    expect(parseSheetNumber('450,5')).toBe(450.5)
  })

  /**
   * "1,234" é ambíguo: 1234 em inglês, 1,234 em português. A regra escolhida é
   * a que serve ao público do app — vírgula sozinha é SEMPRE decimal, igual a
   * "450,5". Tratá-la como milhar faria "0,5 kg" virar 5 kg.
   */
  it('trata vírgula sozinha como decimal, não como milhar', () => {
    expect(parseSheetNumber('1,234')).toBe(1.234)
  })

  it('trata ponto sozinho como decimal', () => {
    expect(parseSheetNumber('1.234')).toBe(1.234)
  })

  it('lê inteiro simples', () => {
    expect(parseSheetNumber('12')).toBe(12)
  })

  it('devolve NaN para texto vazio ou inválido', () => {
    expect(parseSheetNumber('')).toBeNaN()
    expect(parseSheetNumber('abc')).toBeNaN()
  })
})
