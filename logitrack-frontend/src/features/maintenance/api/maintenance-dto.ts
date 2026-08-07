export type MaintenanceStatusDto = 'PENDENTE' | 'EM_REALIZACAO' | 'CONCLUIDA'
export type VehicleOperationalStatusDto = 'DISPONIVEL' | 'EM_USO' | 'MANUTENCAO'

type MaintenanceItemDto = {
  id: number
  servicoId: number
  nome: string
  custo: number
}

export type MaintenanceDto = {
  id: number
  veiculoId: number
  veiculoPlaca: string
  veiculoModelo: string
  dataInicioPrevista: string
  dataFinalizacaoPrevista: string
  iniciadaEm?: string
  concluidaEm?: string
  servicos: MaintenanceItemDto[]
  custoTotal: number
  status: MaintenanceStatusDto
  atrasada: boolean
}

export type MaintenanceSummaryDto = {
  totalVeiculos: number
  veiculosIndisponiveis: number
  custoMesAtual: number
  ordensEmAndamento: number
  tarefasAtrasadas: number
  agenda: MaintenanceDto[]
}

export type MaintenanceVehicleDto = {
  id: number
  placa: string
  modelo: string
  descricao: string
  emUso: boolean
  statusOperacional: VehicleOperationalStatusDto
}

export type MaintenanceCatalogServiceDto = {
  id: number
  nome: string
  ativo: boolean
}
