import 'server-only'

import { apiFetch } from '@/shared/api/server-fetch'
import { mapPaged, type Paged, type PagedResponse } from '@/shared/api/page'
import type { TripFilters } from '../model/trip-filters'
import type { DriverOption, Trip, TripDetails, VehicleOption } from '../model/trip'
import type {
  DriverOptionDto,
  TripDetailsDto,
  TripDto,
  TripInputDto,
  VehicleOptionDto,
} from './trip-dto'
import { STATUS_TO_DTO, toDriverOption, toTrip, toTripDetails, toVehicleOption } from './trip-mapper'

function toParams(page: number, size: number, filters: TripFilters): URLSearchParams {
  const params = new URLSearchParams({ page: String(page), size: String(size), sort: 'dataSaida,desc' })
  if (filters.search) params.set('busca', filters.search)
  if (filters.vehicleId) params.set('veiculoId', String(filters.vehicleId))
  if (filters.status) params.set('status', STATUS_TO_DTO[filters.status])
  return params
}

export async function fetchTrips(page: number, size: number, filters: TripFilters): Promise<Paged<Trip>> {
  const response = await apiFetch<PagedResponse<TripDto>>('/api/viagens', {
    searchParams: toParams(page, size, filters),
  })
  return mapPaged(response, toTrip)
}

export async function fetchTripDetails(id: number): Promise<TripDetails> {
  return toTripDetails(await apiFetch<TripDetailsDto>(`/api/viagens/${id}/detalhes`))
}

export async function fetchVehicleOptions(): Promise<VehicleOption[]> {
  return (await apiFetch<VehicleOptionDto[]>('/api/veiculos')).map(toVehicleOption)
}

export async function fetchDriverOptions(): Promise<DriverOption[]> {
  return (await apiFetch<DriverOptionDto[]>('/api/motoristas')).map(toDriverOption)
}

export async function createTrip(input: TripInputDto): Promise<Trip> {
  return toTrip(await apiFetch<TripDto>('/api/viagens', { method: 'POST', body: input }))
}

export async function updateTrip(id: number, input: TripInputDto): Promise<Trip> {
  return toTrip(await apiFetch<TripDto>(`/api/viagens/${id}`, { method: 'PUT', body: input }))
}

export async function startTrip(id: number): Promise<void> {
  await apiFetch(`/api/viagens/${id}/iniciar`, { method: 'PATCH' })
}

export async function finishTrip(id: number): Promise<void> {
  await apiFetch(`/api/viagens/${id}/concluir`, { method: 'PATCH' })
}

/** Registra a chegada em um ponto da rota; o backend encerra a viagem se for o ultimo. */
export async function completeTripStage(tripId: number, stageId: number): Promise<void> {
  await apiFetch(`/api/viagens/${tripId}/trechos/${stageId}/concluir`, { method: 'PATCH' })
}

export async function cancelTrip(id: number): Promise<void> {
  await apiFetch(`/api/viagens/${id}/cancelar`, { method: 'PATCH' })
}

export async function deleteTrip(id: number): Promise<void> {
  await apiFetch(`/api/viagens/${id}`, { method: 'DELETE' })
}

export async function deleteTrips(ids: readonly number[]): Promise<void> {
  await apiFetch('/api/viagens', { method: 'DELETE', body: { ids } })
}
