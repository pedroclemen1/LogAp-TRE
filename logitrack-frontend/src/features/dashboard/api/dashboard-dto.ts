export type VehicleTypeDto = 'LEVE' | 'PESADO'
export type VehicleOperationalStatusDto = 'DISPONIVEL' | 'EM_USO' | 'MANUTENCAO'
export type MaintenanceStatusDto = 'PENDENTE' | 'EM_REALIZACAO' | 'CONCLUIDA'

type CategoryVolumeDto = {
  tipo: VehicleTypeDto
  totalViagens: number
  totalKm: number
}

type ScheduledMaintenanceDto = {
  id: number
  placa: string
  modelo: string
  dataInicio: string
  tipoServico: string
  custoEstimado: number
  status: MaintenanceStatusDto
}

export type VehicleUsageDto = {
  id: number
  placa: string
  modelo: string
  tipo: VehicleTypeDto
  kmAcumulado: number
}

type DailyDistanceDto = {
  data: string
  totalKm: number
}

export type DashboardDto = {
  totalKm: number
  volumePorCategoria: CategoryVolumeDto[]
  proximasManutencoes: ScheduledMaintenanceDto[]
  rankingUtilizacao: VehicleUsageDto[]
  veiculoMaisUtilizado?: VehicleUsageDto
  projecaoFinanceiraMesAtual: number
  serieKmPorDia: DailyDistanceDto[]
}

export type DashboardVehicleDto = {
  id: number
  tipo: VehicleTypeDto
  statusOperacional: VehicleOperationalStatusDto
}
