import { describe, expect, it } from 'vitest'
import { candidateRoutePath, type ManifestCandidate, type ManifestStage } from './manifest'

function trecho(order: number, origin: string, destination: string): ManifestStage {
  return { stageId: order, order, origin, destination, distanceKm: 0, loadKg: 0, completed: true }
}

function candidato(stages: ManifestStage[]): ManifestCandidate {
  return {
    tripId: 22,
    departureAt: '2026-08-07T04:36:00',
    origin: 'Natal-RN',
    destination: 'Porto Alegre',
    vehiclePlate: 'ABC-1234',
    vehicleModel: 'Fiorino',
    status: 'completed',
    stages,
  }
}

describe('candidateRoutePath', () => {
  // O caso que motivou a mudanca: Romaneios mostrava "Natal-RN -> Porto Alegre"
  // enquanto Viagens mostrava a rota inteira, para a MESMA viagem.
  it('monta o caminho a partir dos trechos, como a tela de Viagens', () => {
    const path = candidateRoutePath(candidato([
      trecho(1, 'Natal-RN', 'Recife'),
      trecho(2, 'Recife', 'Porto Alegre'),
    ]))

    expect(path).toEqual(['Natal-RN', 'Recife', 'Porto Alegre'])
  })

  it('mantem a rota de um trecho so com duas pontas', () => {
    const path = candidateRoutePath(candidato([trecho(1, 'Natal-RN', 'Porto Alegre')]))

    expect(path).toEqual(['Natal-RN', 'Porto Alegre'])
  })

  // A origem sai da VIAGEM, nao de `stages[0]`, justamente para este caso.
  it('cai no par origem/destino quando a viagem nao tem trecho', () => {
    expect(candidateRoutePath(candidato([]))).toEqual(['Natal-RN', 'Porto Alegre'])
  })
})
