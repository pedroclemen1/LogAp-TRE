import { describe, expect, it } from 'vitest'
import { pageHeightMm } from './sheet-pdf'

/**
 * A proporção é o que garante "uma página só": a largura é fixa em A4 e a
 * altura acompanha o conteúdo, então o documento nunca é fatiado.
 */
describe('pageHeightMm', () => {
  it('mantém a proporção da captura', () => {
    // Captura quadrada -> página quadrada de 210mm.
    expect(pageHeightMm(1000, 1000)).toBeCloseTo(210, 5)
  })

  it('cresce com a altura do conteúdo — mais itens, página mais longa', () => {
    const curta = pageHeightMm(1000, 1400)
    const longa = pageHeightMm(1000, 2800)
    expect(longa).toBeCloseTo(curta * 2, 5)
  })

  it('independe da escala de captura: só a proporção importa', () => {
    expect(pageHeightMm(1000, 1500)).toBeCloseTo(pageHeightMm(2000, 3000), 5)
  })

  it('uma folha A4 de proporção clássica dá ~297mm', () => {
    expect(pageHeightMm(2100, 2970)).toBeCloseTo(297, 1)
  })

  /** Sem dimensão não dá para calcular proporção; devolve A4 em vez de dividir por zero. */
  it('largura zero cai no A4 em vez de gerar NaN', () => {
    expect(pageHeightMm(0, 500)).toBe(210)
    expect(Number.isNaN(pageHeightMm(0, 500))).toBe(false)
  })
})
