import 'server-only'

import { apiFetch } from '@/shared/api/server-fetch'
import type { Driver, DriverInput, ReferenceFilters } from '../model/reference-data'
import type { DriverDto } from './reference-data-dto'

const API_STATUS = { active: 'ATIVO', inactive: 'INATIVO', all: 'TODOS' } as const

function toDriver(dto: DriverDto): Driver {
  return {
    id: dto.id,
    name: dto.nome,
    license: dto.cnh,
    phone: dto.telefone,
    active: dto.ativo,
    inUse: dto.statusOperacional === 'EM_USO',
  }
}

export async function fetchDrivers(filters: ReferenceFilters): Promise<Driver[]> {
  const params = new URLSearchParams({ status: API_STATUS[filters.status] })
  if (filters.search) params.set('busca', filters.search)
  return (await apiFetch<DriverDto[]>('/api/motoristas', { searchParams: params })).map(toDriver)
}

export async function createDriver(input: DriverInput): Promise<void> {
  await apiFetch('/api/motoristas', { method: 'POST', body: input })
}

export async function updateDriver(id: number, input: DriverInput): Promise<void> {
  await apiFetch(`/api/motoristas/${id}`, { method: 'PUT', body: input })
}

export async function deactivateDriver(id: number): Promise<void> {
  await apiFetch(`/api/motoristas/${id}`, { method: 'DELETE' })
}

export async function reactivateDriver(id: number): Promise<void> {
  await apiFetch(`/api/motoristas/${id}/reativar`, { method: 'PATCH' })
}
