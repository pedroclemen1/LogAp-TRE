export type VehicleTypeDto = 'LEVE' | 'PESADO'
export type TripStatusDto = 'PROGRAMADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA'
export type TripEventTypeDto =
  | 'CRIADA'
  | 'INICIADA'
  | 'ROTA_ATUALIZADA'
  | 'CONCLUIDA'
  | 'CANCELADA'
  | 'TRECHO_CONCLUIDO'

export type TripDto = {
  id: number
  veiculoId: number
  veiculoPlaca: string
  veiculoModelo: string
  veiculoTipo: VehicleTypeDto
  motoristaId?: number
  motoristaNome?: string
  dataSaida: string
  iniciadaEm?: string
  dataChegadaPrevista?: string
  dataChegada?: string
  origem: string
  destino: string
  kmPercorrida: number
  cargaKg?: number
  canceladaEm?: string
  status: TripStatusDto
  /**
   * Paradas e destino na ordem da rota, sem a origem. So vem na LISTAGEM: nas
   * respostas de item unico o backend omite o campo, porque ali o detalhe da
   * rota vem por `/detalhes`.
   */
  rota?: string[]
}

type TripStageDto = {
  id: number
  ordem: number
  cidade: string
  kmTrecho: number
  cargaKg: number
  previstoEm?: string
  realizadoEm?: string
}

type TripEventDto = {
  id: number
  tipo: TripEventTypeDto
  titulo: string
  detalhe?: string
  autor: string
  ocorridoEm: string
}

export type TripDetailsDto = {
  viagem: TripDto
  etapas: TripStageDto[]
  eventos: TripEventDto[]
}

export type VehicleOptionDto = {
  id: number
  placa: string
  modelo: string
  tipo: VehicleTypeDto
  descricao: string
  emUso: boolean
  statusOperacional: 'DISPONIVEL' | 'EM_USO' | 'MANUTENCAO'
}

export type DriverOptionDto = {
  id: number
  nome: string
  cnh?: string
  telefone?: string
  statusOperacional: 'LIVRE' | 'EM_USO'
}

export type TripInputDto = {
  veiculoId: number
  motoristaId?: number
  dataSaida: string
  origem: string
  trechos: TripStageInputDto[]
}

export type TripStageInputDto = {
  id?: number
  destino: string
  kmTrecho: number
  cargaKg: number
  previstoEm?: string
}
