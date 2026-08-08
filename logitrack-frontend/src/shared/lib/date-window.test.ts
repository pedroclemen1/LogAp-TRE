import { describe, expect, it } from 'vitest'
import { dateBounds, dateTimeBounds, isWithinDateWindow } from './date-window'

/** Datas relativas a hoje: a janela acompanha o relogio, nao um ano fixo. */
function shiftYears(years: number): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() + years)
  return date.toISOString().slice(0, 10)
}

describe('isWithinDateWindow', () => {
  it('aceita hoje', () => {
    expect(isWithinDateWindow(new Date().toISOString().slice(0, 10))).toBe(true)
  })

  it('recusa o ano absurdo que motivou a regra', () => {
    expect(isWithinDateWindow('9999-05-20')).toBe(false)
    expect(isWithinDateWindow('9999-05-20T10:30')).toBe(false)
  })

  it('aceita passado dentro da janela e recusa alem dela', () => {
    expect(isWithinDateWindow(shiftYears(-4))).toBe(true)
    expect(isWithinDateWindow(shiftYears(-6))).toBe(false)
  })

  it('aceita futuro dentro da janela e recusa alem dela', () => {
    expect(isWithinDateWindow(shiftYears(1))).toBe(true)
    expect(isWithinDateWindow(shiftYears(3))).toBe(false)
  })

  it('aceita as proprias bordas, que sao inclusivas', () => {
    const bounds = dateBounds()
    expect(isWithinDateWindow(bounds.min)).toBe(true)
    expect(isWithinDateWindow(bounds.max)).toBe(true)
  })

  it('trata vazio como valido: ausencia e do campo obrigatorio', () => {
    expect(isWithinDateWindow('')).toBe(true)
  })

  it('recusa valor malformado em vez de aceitar por omissao', () => {
    expect(isWithinDateWindow('20;05;9999')).toBe(false)
    expect(isWithinDateWindow('abc')).toBe(false)
    expect(isWithinDateWindow('2026-13')).toBe(false)
  })

  it('ignora a parte de hora ao comparar o dia', () => {
    const bounds = dateBounds()
    expect(isWithinDateWindow(`${bounds.max}T23:59`)).toBe(true)
    expect(isWithinDateWindow(`${bounds.min}T00:00`)).toBe(true)
  })
})

describe('limites dos inputs', () => {
  it('usa o formato exigido por type=date', () => {
    const bounds = dateBounds()
    expect(bounds.min).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(bounds.max).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(bounds.min < bounds.max).toBe(true)
  })

  it('usa o formato exigido por type=datetime-local', () => {
    const bounds = dateTimeBounds()
    expect(bounds.min).toMatch(/^\d{4}-\d{2}-\d{2}T00:00$/)
    expect(bounds.max).toMatch(/^\d{4}-\d{2}-\d{2}T23:59$/)
  })
})
