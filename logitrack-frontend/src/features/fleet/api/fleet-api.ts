import 'server-only'

import { apiFetch } from '@/shared/api/server-fetch'
import { mapPaged, type Paged, type PagedResponse } from '@/shared/api/page'
import type { FleetFilters } from '../model/fleet-filters'
import type { FleetVehicle } from '../model/vehicle'
import type { FleetVehicleDto } from './fleet-dto'
import { OPERATIONAL_BY_STATUS, TYPE_BY_CATEGORY, toFleetVehicle } from './fleet-mapper'

const FLEET_PATH = '/api/veiculos/frota'

/** Cabe na altura da tabela sem rolagem interna na maioria das telas. */
const FLEET_PAGE_SIZE = 20

/**
 * Pagina grande para a exportacao: o CSV nao pagina.
 * O `fetchAllFleet` avisa em log se a frota passar disso, em vez de truncar
 * silenciosamente e entregar um arquivo incompleto que parece completo.
 */
const EXPORT_PAGE_SIZE = 500

function toApiParams(filters: FleetFilters, page: number, size: number): URLSearchParams {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (filters.search) params.set('busca', filters.search)
  if (filters.category) params.set('tipo', TYPE_BY_CATEGORY[filters.category])
  if (filters.status) params.set('status', OPERATIONAL_BY_STATUS[filters.status])
  return params
}

/** Corpo de `POST /api/veiculos`, no vocabulario da API. */
type CreateVehicleInput = {
  placa: string
  modelo: string
  tipo: 'LEVE' | 'PESADO'
  ano: number
  kmInicial: number
}

export async function createVehicle(input: CreateVehicleInput): Promise<void> {
  await apiFetch('/api/veiculos', { method: 'POST', body: input })
}

export async function updateVehicle(id: number, input: CreateVehicleInput): Promise<void> {
  await apiFetch(`/api/veiculos/${id}`, { method: 'PUT', body: input })
}

export async function deleteVehicle(id: number): Promise<void> {
  await apiFetch(`/api/veiculos/${id}`, { method: 'DELETE' })
}

export async function deleteVehicles(ids: readonly number[]): Promise<void> {
  await apiFetch('/api/veiculos', { method: 'DELETE', body: { ids } })
}

export async function fetchFleet(page: number, filters: FleetFilters): Promise<Paged<FleetVehicle>> {
  const response = await apiFetch<PagedResponse<FleetVehicleDto>>(FLEET_PATH, {
    searchParams: toApiParams(filters, page, FLEET_PAGE_SIZE),
  })

  return mapPaged(response, toFleetVehicle)
}

/**
 * Percorre TODAS as paginas. Usado apenas pela exportacao em CSV.
 *
 * Devolve o DTO cru, sem passar pelo mapper de proposito: o CSV reproduz o
 * vocabulario do banco (`LEVE`, `EM_USO`, datas ISO), nao o do frontend.
 * Traduzir para `light`/`in_use` e depois destraduzir seria trabalho perdido e
 * uma chance a mais de divergencia.
 *
 * Percorre em vez de pedir uma pagina gigante: assim a frota pode crescer sem
 * que o arquivo passe a sair truncado em silencio.
 */
export async function fetchAllFleetRaw(filters: FleetFilters): Promise<FleetVehicleDto[]> {
  const all: FleetVehicleDto[] = []
  let page = 0
  let totalPages = 1

  while (page < totalPages) {
    const response = await apiFetch<PagedResponse<FleetVehicleDto>>(FLEET_PATH, {
      searchParams: toApiParams(filters, page, EXPORT_PAGE_SIZE),
    })

    all.push(...response.content)
    totalPages = response.page.totalPages
    page += 1
  }

  return all
}
