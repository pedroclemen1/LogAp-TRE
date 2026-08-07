import { VEHICLE_STATUSES, type VehicleStatus } from '@/entities/vehicle/model/vehicle-status'
import { VEHICLE_CATEGORIES, type VehicleCategory } from './vehicle'

/**
 * Estado dos filtros da tela de Frota.
 *
 * Vive na URL, nao em estado de componente. Consequencias: o filtro sobrevive
 * ao recarregar, volta com o botao de voltar do navegador, e a tela continua
 * sendo um Server Component — quem busca e a `page.tsx`, que ja le a URL.
 */
export type FleetFilters = {
  /** Trecho de placa ou modelo. String vazia significa "sem busca". */
  search: string
  category?: VehicleCategory
  status?: VehicleStatus
}

/** Nomes dos parametros na URL, em portugues como o resto das rotas. */
export type FleetSearchParams = {
  busca?: string
  categoria?: string
  status?: string
  page?: string
}

/**
 * Le a URL com desconfianca: qualquer pessoa pode digitar `?categoria=foo`.
 * Valor fora do dominio e descartado em vez de ser repassado a API.
 */
export function parseFleetFilters(params: FleetSearchParams): FleetFilters {
  return {
    search: params.busca?.trim() ?? '',
    category: asVehicleCategory(params.categoria),
    status: asVehicleStatus(params.status),
  }
}

/** Converte texto solto (URL ou <select>) em valor do dominio, ou nada. */
export function asVehicleCategory(value: string | undefined): VehicleCategory | undefined {
  return matchOption(VEHICLE_CATEGORIES, value)
}

export function asVehicleStatus(value: string | undefined): VehicleStatus | undefined {
  return matchOption(VEHICLE_STATUSES, value)
}

/** Monta a query preservando so o que esta preenchido, para nao poluir a URL. */
export function fleetFiltersToQuery(filters: FleetFilters): URLSearchParams {
  const query = new URLSearchParams()
  if (filters.search) query.set('busca', filters.search)
  if (filters.category) query.set('categoria', filters.category)
  if (filters.status) query.set('status', filters.status)
  return query
}

export function hasActiveFleetFilters(filters: FleetFilters): boolean {
  return Boolean(filters.search || filters.category || filters.status)
}

function matchOption<T extends string>(allowed: readonly T[], value: string | undefined): T | undefined {
  return allowed.find((option) => option === value)
}
