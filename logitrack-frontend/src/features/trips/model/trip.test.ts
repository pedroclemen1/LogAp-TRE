import { describe, expect, it } from 'vitest'
import { tripRoutePath, type Trip } from './trip'

function viagem(overrides: Partial<Trip>): Trip {
  return {
    id: 22,
    vehicleId: 1,
    vehiclePlate: 'ABC-1234',
    vehicleModel: 'Fiorino',
    vehicleKind: 'van',
    departureAt: '2026-08-07T04:36:00',
    origin: 'Natal-RN',
    destination: 'Porto Alegre',
    distanceKm: 3250,
    status: 'completed',
    ...overrides,
  }
}

describe('tripRoutePath', () => {
  it('intercala as paradas entre origem e destino', () => {
    const path = tripRoutePath(viagem({ routeCities: ['Recife', 'Porto Alegre'] }))

    expect(path).toEqual(['Natal-RN', 'Recife', 'Porto Alegre'])
  })

  // Respostas de item unico omitem `routeCities`; sem paradas conhecidas, o par
  // origem/destino e a rota inteira.
  it('cai no par origem/destino quando nao ha paradas', () => {
    expect(tripRoutePath(viagem({}))).toEqual(['Natal-RN', 'Porto Alegre'])
    expect(tripRoutePath(viagem({ routeCities: [] }))).toEqual(['Natal-RN', 'Porto Alegre'])
  })

  // O destino ja e o ultimo item de `routeCities`: repeti-lo desenharia
  // "-> Porto Alegre -> Porto Alegre".
  it('nao repete o destino quando ele ja fecha as paradas', () => {
    const path = tripRoutePath(viagem({ routeCities: ['Recife', 'Porto Alegre'] }))

    expect(path.filter((city) => city === 'Porto Alegre')).toHaveLength(1)
  })
})
