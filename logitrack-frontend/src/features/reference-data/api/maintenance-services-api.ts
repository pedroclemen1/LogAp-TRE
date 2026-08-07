import 'server-only'

import { apiFetch } from '@/shared/api/server-fetch'
import type { MaintenanceServiceInput, MaintenanceServiceItem, ReferenceFilters } from '../model/reference-data'
import type { MaintenanceServiceDto } from './reference-data-dto'

const API_STATUS = { active: 'ATIVO', inactive: 'INATIVO', all: 'TODOS' } as const

function toItem(dto: MaintenanceServiceDto): MaintenanceServiceItem {
  return { id: dto.id, name: dto.nome, active: dto.ativo }
}

export async function fetchMaintenanceServices(filters: ReferenceFilters): Promise<MaintenanceServiceItem[]> {
  const params = new URLSearchParams({ status: API_STATUS[filters.status] })
  if (filters.search) params.set('busca', filters.search)
  return (await apiFetch<MaintenanceServiceDto[]>('/api/servicos-manutencao', { searchParams: params })).map(toItem)
}

export async function createMaintenanceService(input: MaintenanceServiceInput): Promise<void> {
  await apiFetch('/api/servicos-manutencao', { method: 'POST', body: input })
}

export async function updateMaintenanceService(id: number, input: MaintenanceServiceInput): Promise<void> {
  await apiFetch(`/api/servicos-manutencao/${id}`, { method: 'PUT', body: input })
}

export async function deactivateMaintenanceService(id: number): Promise<void> {
  await apiFetch(`/api/servicos-manutencao/${id}`, { method: 'DELETE' })
}

export async function reactivateMaintenanceService(id: number): Promise<void> {
  await apiFetch(`/api/servicos-manutencao/${id}/reativar`, { method: 'PATCH' })
}
