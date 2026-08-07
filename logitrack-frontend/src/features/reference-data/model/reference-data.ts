export const RECORD_STATUSES = ['active', 'inactive', 'all'] as const
export type RecordStatus = (typeof RECORD_STATUSES)[number]

export type ReferenceFilters = {
  search: string
  status: RecordStatus
}

export type ReferenceSearchParams = {
  busca?: string
  status?: string
}

export type Driver = {
  id: number
  name: string
  license: string
  phone?: string
  active: boolean
  inUse: boolean
}

export type MaintenanceServiceItem = {
  id: number
  name: string
  active: boolean
}

export type DriverInput = {
  nome: string
  cnh: string
  telefone?: string
}

export type MaintenanceServiceInput = {
  nome: string
}

export type ReferenceMutationState =
  | { status: 'success' }
  | { status: 'error'; message?: string; fieldErrors?: Record<string, string> }

export function parseReferenceFilters(params: ReferenceSearchParams): ReferenceFilters {
  return {
    search: params.busca?.trim() ?? '',
    status: RECORD_STATUSES.includes(params.status as RecordStatus)
      ? params.status as RecordStatus
      : 'active',
  }
}

export function referenceFiltersToQuery(filters: ReferenceFilters): URLSearchParams {
  const query = new URLSearchParams()
  if (filters.search) query.set('busca', filters.search)
  if (filters.status !== 'active') query.set('status', filters.status)
  return query
}
