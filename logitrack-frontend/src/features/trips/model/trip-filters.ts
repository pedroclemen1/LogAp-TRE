import { TRIP_STATUSES, type TripStatus } from './trip'

const TRIP_PAGE_SIZES = [10, 25, 50] as const
export type TripPageSize = (typeof TRIP_PAGE_SIZES)[number]

export type TripFilters = {
  search: string
  status?: TripStatus
  vehicleId?: number
}

export type TripSearchParams = {
  busca?: string
  status?: string
  veiculo?: string
  page?: string
  size?: string
}

export function parseTripFilters(params: TripSearchParams): TripFilters {
  return {
    search: params.busca?.trim() ?? '',
    status: TRIP_STATUSES.find((status) => status === params.status),
    vehicleId: positiveInteger(params.veiculo),
  }
}

export function parseTripPageSize(value: string | undefined): TripPageSize {
  const parsed = Number(value)
  return TRIP_PAGE_SIZES.find((size) => size === parsed) ?? 10
}

export function tripFiltersToQuery(filters: TripFilters, size: TripPageSize): URLSearchParams {
  const query = new URLSearchParams()
  if (filters.search) query.set('busca', filters.search)
  if (filters.status) query.set('status', filters.status)
  if (filters.vehicleId) query.set('veiculo', String(filters.vehicleId))
  if (size !== 10) query.set('size', String(size))
  return query
}

export function hasActiveTripFilters(filters: TripFilters): boolean {
  return Boolean(filters.search || filters.status || filters.vehicleId)
}

export function asTripStatus(value: string): TripStatus | undefined {
  return TRIP_STATUSES.find((status) => status === value)
}

export function asVehicleId(value: string): number | undefined {
  return positiveInteger(value)
}

function positiveInteger(value: string | undefined): number | undefined {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}
