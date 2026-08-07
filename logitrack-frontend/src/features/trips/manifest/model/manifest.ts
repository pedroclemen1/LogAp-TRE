import type { TripStatus } from '@/features/trips/model/trip'

/** Valores numéricos permanecem crus; a apresentação é responsabilidade da UI. */
export type ManifestItem = {
  id?: number
  sequence?: number
  invoice: string
  recipient: string
  volumes: number
  weightKg: number
}

/** Documento completo, como sai impresso. Cobre UM trecho da rota. */
export type Manifest = {
  id: number
  tripId: number
  stageId: number
  /** Número do trecho impresso no documento. */
  stageOrder: number
  number: string
  issuedAt: string
  issuedBy: string
  authentication: string

  carrierName: string
  carrierTaxId: string
  carrierRegistry?: string

  driverName: string
  driverLicense?: string
  vehiclePlate: string
  vehicleDescription: string

  originName: string
  originAddress?: string
  destinationName: string
  destinationAddress?: string
  distanceKm: number

  items: ManifestItem[]
  totalVolumes: number
  totalWeightKg: number
}


/** Um trecho da rota, com o estado do romaneio dele. */
export type ManifestStage = {
  stageId: number
  order: number
  /** Ponto de partida: cidade do trecho anterior, ou a origem da viagem no trecho 1. */
  origin: string
  destination: string
  distanceKm: number
  loadKg: number
  expectedAt?: string
  arrivedAt?: string
  /** Só trecho concluído emite romaneio. */
  completed: boolean
  /** Presente = já tem documento; a tela troca "Emitir" por "Abrir". */
  manifestId?: number
}

/** Uma viagem na tela de Romaneios, com seus trechos. */
export type ManifestCandidate = {
  tripId: number
  departureAt: string
  origin: string
  destination: string
  vehiclePlate: string
  vehicleModel: string
  driverName?: string
  driverLicense?: string
  status: TripStatus
  stages: readonly ManifestStage[]
}

/** Deriva o caminho dos trechos ordenados e preserva a origem em viagens sem trecho. */
export function candidateRoutePath(candidate: ManifestCandidate): string[] {
  const stops = candidate.stages.length
    ? candidate.stages.map((stage) => stage.destination)
    : [candidate.destination]
  return [candidate.origin, ...stops]
}

export type ManifestFormState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  fieldErrors?: Record<string, string>
  /** Id do romaneio recém-emitido, para a tela abrir o documento. */
  createdId?: number
}

export const EMPTY_MANIFEST_FORM_STATE: ManifestFormState = { status: 'idle' }
