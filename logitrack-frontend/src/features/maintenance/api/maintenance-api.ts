import 'server-only'

import { getLocale } from 'next-intl/server'
import { apiFetch } from '@/shared/api/server-fetch'
import { mapPaged, type Paged, type PagedResponse } from '@/shared/api/page'
import type { MaintenanceFilters } from '../model/maintenance-filters'
import type {
  MaintenanceCatalogService,
  MaintenanceInput,
  MaintenanceOrder,
  MaintenanceSummary,
  MaintenanceVehicleOption,
} from '../model/maintenance'
import type {
  MaintenanceCatalogServiceDto,
  MaintenanceDto,
  MaintenanceSummaryDto,
  MaintenanceVehicleDto,
} from './maintenance-dto'
import { STATUS_TO_DTO, toCatalogService, toMaintenance, toMaintenanceSummary, toMaintenanceVehicle } from './maintenance-mapper'
import { maintenanceServiceSearchSource } from '../lib/maintenance-service-name'

const MAINTENANCE_PAGE_SIZE = 10
const ALERT_PAGE_SIZE = 20
const EXPORT_PAGE_SIZE = 500

const SORT_TO_DTO = {
  date_asc: 'DATA_ASC',
  date_desc: 'DATA_DESC',
  cost_asc: 'CUSTO_ASC',
  cost_desc: 'CUSTO_DESC',
} as const

function toParams(filters: MaintenanceFilters, page: number, size: number, locale: string): URLSearchParams {
  const params = new URLSearchParams({ page: String(page), size: String(size), ordem: SORT_TO_DTO[filters.sort] })
  if (filters.search) params.set('busca', maintenanceServiceSearchSource(filters.search, locale))
  if (filters.vehicleId) params.set('veiculoId', String(filters.vehicleId))
  if (filters.status === 'overdue') params.set('atrasada', 'true')
  else if (filters.status) params.set('status', STATUS_TO_DTO[filters.status])
  if (filters.startFrom) params.set('inicioDe', filters.startFrom)
  if (filters.startTo) params.set('inicioAte', filters.startTo)
  return params
}

async function fetchMaintenancePage(
  page: number,
  size: number,
  filters: MaintenanceFilters,
): Promise<Paged<MaintenanceOrder>> {
  const locale = await getLocale()
  const response = await apiFetch<PagedResponse<MaintenanceDto>>('/api/manutencoes', {
    searchParams: toParams(filters, page, size, locale),
  })
  return mapPaged(response, toMaintenance)
}

export function fetchMaintenances(page: number, filters: MaintenanceFilters): Promise<Paged<MaintenanceOrder>> {
  return fetchMaintenancePage(page, MAINTENANCE_PAGE_SIZE, filters)
}

export async function fetchAllMaintenances(filters: MaintenanceFilters): Promise<MaintenanceOrder[]> {
  const locale = await getLocale()
  const all: MaintenanceOrder[] = []
  let page = 0
  let totalPages = 1
  while (page < totalPages) {
    const response = await apiFetch<PagedResponse<MaintenanceDto>>('/api/manutencoes', {
      searchParams: toParams(filters, page, EXPORT_PAGE_SIZE, locale),
    })
    all.push(...response.content.map(toMaintenance))
    totalPages = response.page.totalPages
    page += 1
  }
  return all
}

export function fetchOverdueMaintenances(): Promise<Paged<MaintenanceOrder>> {
  return fetchMaintenancePage(0, ALERT_PAGE_SIZE, {
    search: '',
    status: 'overdue',
    sort: 'date_asc',
  })
}

export async function fetchMaintenance(id: number): Promise<MaintenanceOrder> {
  return toMaintenance(await apiFetch<MaintenanceDto>(`/api/manutencoes/${id}`))
}

export async function fetchMaintenanceSummary(): Promise<MaintenanceSummary> {
  return toMaintenanceSummary(await apiFetch<MaintenanceSummaryDto>('/api/manutencoes/resumo'))
}

export async function fetchMaintenanceVehicles(): Promise<MaintenanceVehicleOption[]> {
  return (await apiFetch<MaintenanceVehicleDto[]>('/api/veiculos')).map(toMaintenanceVehicle)
}

export async function fetchMaintenanceCatalog(): Promise<MaintenanceCatalogService[]> {
  const params = new URLSearchParams({ status: 'ATIVO' })
  return (await apiFetch<MaintenanceCatalogServiceDto[]>('/api/servicos-manutencao', { searchParams: params }))
    .map(toCatalogService)
}

export async function createMaintenance(input: MaintenanceInput): Promise<void> {
  await apiFetch('/api/manutencoes', { method: 'POST', body: input })
}

export async function updateMaintenance(id: number, input: MaintenanceInput): Promise<void> {
  await apiFetch(`/api/manutencoes/${id}`, { method: 'PUT', body: input })
}

export async function startMaintenance(id: number): Promise<void> {
  await apiFetch(`/api/manutencoes/${id}/iniciar`, { method: 'PATCH' })
}

export async function finishMaintenance(id: number): Promise<void> {
  await apiFetch(`/api/manutencoes/${id}/concluir`, { method: 'PATCH' })
}

export async function deleteMaintenance(id: number): Promise<void> {
  await apiFetch(`/api/manutencoes/${id}`, { method: 'DELETE' })
}
