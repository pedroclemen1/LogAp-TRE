import 'server-only'

import { apiFetch } from '@/shared/api/server-fetch'
import type { Paged, PagedResponse } from '@/shared/api/page'
import { mapPaged } from '@/shared/api/page'
import type { TripStatusDto } from '@/features/trips/api/trip-dto'
import type { Manifest, ManifestCandidate } from '../model/manifest'
import type { ManifestCandidateDto, ManifestDto, ManifestInputDto } from './manifest-dto'
import { toManifest, toManifestCandidate } from './manifest-mapper'

/** Mesmos filtros da tela de Viagens: a listagem de Romaneios espelha aquela. */
type ManifestListQuery = {
  page: number
  size: number
  busca?: string
  veiculoId?: number
  status?: TripStatusDto
}

export async function fetchManifestCandidates(
  query: ManifestListQuery,
): Promise<Paged<ManifestCandidate>> {
  const params = new URLSearchParams({ page: String(query.page), size: String(query.size) })
  if (query.busca) params.set('busca', query.busca)
  if (query.veiculoId) params.set('veiculoId', String(query.veiculoId))
  if (query.status) params.set('status', query.status)

  const response = await apiFetch<PagedResponse<ManifestCandidateDto>>('/api/romaneios/viagens', {
    searchParams: params,
  })
  return mapPaged(response, toManifestCandidate)
}


export async function fetchManifest(id: number): Promise<Manifest> {
  return toManifest(await apiFetch<ManifestDto>(`/api/romaneios/${id}`))
}

export async function issueManifest(input: ManifestInputDto): Promise<Manifest> {
  return toManifest(await apiFetch<ManifestDto>('/api/romaneios', { method: 'POST', body: input }))
}

/** Corrige um documento emitido; o backend recalcula a autenticação. */
export async function updateManifest(id: number, input: ManifestInputDto): Promise<Manifest> {
  return toManifest(await apiFetch<ManifestDto>(`/api/romaneios/${id}`, { method: 'PUT', body: input }))
}
