export const TRIP_STATUSES = ['in_progress', 'scheduled', 'completed', 'canceled'] as const
export type TripStatus = (typeof TRIP_STATUSES)[number]

const VEHICLE_KINDS = ['truck', 'van'] as const
export type VehicleKind = (typeof VEHICLE_KINDS)[number]

export type VehicleOption = {
  id: number
  plate: string
  model: string
  kind: VehicleKind
  label: string
  inUse: boolean
  operationalStatus: 'available' | 'in_use' | 'maintenance'
}

export type DriverOption = {
  id: number
  name: string
  license?: string
  phone?: string
  inUse: boolean
}

/** Valores crus vindos da API; formatacao pertence aos componentes. */
export type Trip = {
  id: number
  vehicleId: number
  vehiclePlate: string
  vehicleModel: string
  vehicleKind: VehicleKind
  driverId?: number
  driverName?: string
  departureAt: string
  startedAt?: string
  expectedArrivalAt?: string
  arrivalAt?: string
  canceledAt?: string
  origin: string
  destination: string
  distanceKm: number
  loadKg?: number
  status: TripStatus
  /**
   * Paradas e destino na ordem, sem a origem. Presente apenas na listagem — a
   * tela de detalhes usa `TripDetails.stages`, que tem km, carga e horarios.
   */
  routeCities?: readonly string[]
}

/**
 * Caminho da viagem para exibicao: origem, paradas e destino na ordem.
 *
 * `routeCities` so vem da LISTAGEM (o backend a omite em respostas de item
 * unico). Quando falta, cai no par origem/destino — sem paradas conhecidas, e
 * exatamente a mesma coisa.
 */
export function tripRoutePath(trip: Trip): string[] {
  const stops = trip.routeCities?.length ? trip.routeCities : [trip.destination]
  return [trip.origin, ...stops]
}

const ROUTE_STAGE_ROLES = ['stop', 'destination'] as const
type RouteStageRole = (typeof ROUTE_STAGE_ROLES)[number]

const ROUTE_STAGE_STATES = ['completed', 'active', 'pending', 'canceled'] as const
export type RouteStageState = (typeof ROUTE_STAGE_STATES)[number]

export type RouteStage = {
  id: number
  city: string
  expectedAt?: string
  actualAt?: string
  role: RouteStageRole
  state: RouteStageState
  distanceKm: number
  loadKg: number
}

const CHANGE_LOG_KINDS = [
  'stage_completed',
  'route_updated',
  'trip_started',
  'trip_created',
  'trip_completed',
  'trip_canceled',
] as const
export type ChangeLogKind = (typeof CHANGE_LOG_KINDS)[number]

export type ChangeLogEntry = {
  id: number
  kind: ChangeLogKind
  title: string
  detail?: string
  author: string
  occurredAt: string
}

export type TripDetails = {
  trip: Trip
  stages: RouteStage[]
  events: ChangeLogEntry[]
}

export type TripDetailsLoadState =
  | { status: 'success'; details: TripDetails }
  | { status: 'error'; message: string }
