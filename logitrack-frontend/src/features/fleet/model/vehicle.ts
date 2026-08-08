import type { VehicleStatus } from '@/entities/vehicle/model/vehicle-status'

export const VEHICLE_CATEGORIES = ['heavy', 'light'] as const
export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number]

type NextMaintenance = {
  /** LocalDate "YYYY-MM-DD" do inicio previsto. */
  scheduledFor: string
  /** Ja passou da data e a manutencao continua em aberto; a tabela pinta de erro. */
  overdue: boolean
}

/**
 * Veiculo como a tela de Frota precisa dele.
 *
 * Valores CRUS, nao formatados: `mileageKm` e numero e as datas sao strings ISO
 * do backend. Formatar aqui empurraria decisao de apresentacao para a camada de
 * dados e impediria ordenar ou comparar sem desfazer a formatacao.
 */
export type FleetVehicle = {
  id: number
  plate: string
  model: string
  category: VehicleCategory
  year?: number
  /** Hodometro informado no cadastro: 0 para zero-quilometro. */
  initialKm: number
  /**
   * Hodometro atual — `initialKm` mais tudo que o veiculo rodou desde entao.
   * E a coluna "Cum. Mileage" da tabela.
   */
  odometerKm: number
  status: VehicleStatus
  /** LocalDateTime da ultima partida; ausente se o veiculo nunca rodou. */
  lastTripAt?: string
  /** Ausente quando nao ha manutencao em aberto para o veiculo. */
  nextMaintenance?: NextMaintenance
}
