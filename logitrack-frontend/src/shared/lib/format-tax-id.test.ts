import { describe, expect, it } from 'vitest'
import { formatTaxId } from './format'

describe('formatTaxId', () => {
  it('aplica a mascara nos 14 digitos persistidos', () => {
    expect(formatTaxId('12345678000195')).toBe('12.345.678/0001-95')
  })

  it('aceita valor que ja chega pontuado', () => {
    expect(formatTaxId('12.345.678/0001-95')).toBe('12.345.678/0001-95')
  })

  it('devolve intacto o que nao tiver 14 digitos', () => {
    // Registro anterior a regra continua legivel em vez de virar texto cortado.
    expect(formatTaxId('123')).toBe('123')
    expect(formatTaxId('')).toBe('')
    expect(formatTaxId('nao informado')).toBe('nao informado')
  })

  it('nao valida digito verificador: sequencia repetida e formatada', () => {
    // Decisao deliberada — dado de teste precisa ser livre.
    expect(formatTaxId('00000000000000')).toBe('00.000.000/0000-00')
  })
})
