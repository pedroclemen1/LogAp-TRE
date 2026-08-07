import type { TripStatusDto } from '@/features/trips/api/trip-dto'

export type ManifestItemDto = {
  id: number
  sequencia: number
  notaFiscal: string
  destinatario: string
  volumes: number
  pesoKg: number
}

export type ManifestDto = {
  id: number
  viagemId: number
  viagemEtapaId: number
  trechoOrdem: number
  numero: string
  emitidoEm: string
  emitidoPor: string
  autenticacao: string
  transportadoraRazaoSocial: string
  transportadoraCnpj: string
  transportadoraAntt?: string
  motoristaNome: string
  motoristaCnh?: string
  veiculoPlaca: string
  veiculoDescricao: string
  origemNome: string
  origemEndereco?: string
  destinoNome: string
  destinoEndereco?: string
  distanciaKm: number
  itens: ManifestItemDto[]
  totalVolumes: number
  totalPesoKg: number
}


export type ManifestStageDto = {
  etapaId: number
  ordem: number
  origem: string
  destino: string
  kmTrecho: number
  cargaKg: number
  previstoEm?: string
  realizadoEm?: string
  concluido: boolean
  romaneioId?: number
}

export type ManifestCandidateDto = {
  viagemId: number
  dataSaida: string
  origem: string
  destino: string
  veiculoPlaca: string
  veiculoModelo: string
  motoristaNome?: string
  motoristaCnh?: string
  status: TripStatusDto
  trechos: ManifestStageDto[]
}

export type ManifestItemInputDto = {
  notaFiscal: string
  destinatario: string
  volumes: number
  pesoKg: number
}

export type ManifestInputDto = {
  viagemEtapaId: number
  transportadoraRazaoSocial: string
  transportadoraCnpj: string
  transportadoraAntt?: string
  veiculoDescricao: string
  origemEndereco?: string
  destinoEndereco?: string
  itens: ManifestItemInputDto[]
}
