export const MAINTENANCE_FILTER_STATUSES = ['pending', 'in_progress', 'completed', 'overdue'] as const
export type MaintenanceFilterStatus = (typeof MAINTENANCE_FILTER_STATUSES)[number]

export const MAINTENANCE_SORTS = ['date_asc', 'date_desc', 'cost_asc', 'cost_desc'] as const
export type MaintenanceSort = (typeof MAINTENANCE_SORTS)[number]

export type MaintenanceFilters = {
  search: string
  vehicleId?: number
  status?: MaintenanceFilterStatus
  startFrom?: string
  startTo?: string
  sort: MaintenanceSort
}

export type MaintenanceSearchParams = {
  busca?: string
  veiculo?: string
  status?: string
  inicioDe?: string
  inicioAte?: string
  ordem?: string
  page?: string
}

function validDate(value: string | undefined): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const [year, month, day] = value.split('-').map(Number)
  if (month < 1 || month > 12 || day < 1) return undefined
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return day <= daysInMonth ? value : undefined
}

function validDateRange(startFrom: string | undefined, startTo: string | undefined) {
  if (startFrom && startTo && startTo < startFrom) {
    return { startFrom, startTo: undefined }
  }
  return { startFrom, startTo }
}

export function parseMaintenanceFilters(params: MaintenanceSearchParams): MaintenanceFilters {
  const vehicle = Number(params.veiculo)
  const dates = validDateRange(validDate(params.inicioDe), validDate(params.inicioAte))
  return {
    search: params.busca?.trim() ?? '',
    vehicleId: Number.isInteger(vehicle) && vehicle > 0 ? vehicle : undefined,
    status: MAINTENANCE_FILTER_STATUSES.includes(params.status as MaintenanceFilterStatus)
      ? params.status as MaintenanceFilterStatus
      : undefined,
    startFrom: dates.startFrom,
    startTo: dates.startTo,
    sort: MAINTENANCE_SORTS.includes(params.ordem as MaintenanceSort)
      ? params.ordem as MaintenanceSort
      : 'date_asc',
  }
}

export function maintenanceFiltersToQuery(filters: MaintenanceFilters): URLSearchParams {
  const query = new URLSearchParams()
  const dates = validDateRange(validDate(filters.startFrom), validDate(filters.startTo))
  if (filters.search) query.set('busca', filters.search)
  if (filters.vehicleId) query.set('veiculo', String(filters.vehicleId))
  if (filters.status) query.set('status', filters.status)
  if (dates.startFrom) query.set('inicioDe', dates.startFrom)
  if (dates.startTo) query.set('inicioAte', dates.startTo)
  if (filters.sort !== 'date_asc') query.set('ordem', filters.sort)
  return query
}
