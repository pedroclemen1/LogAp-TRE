import 'server-only'

import { apiFetch } from '@/shared/api/server-fetch'
import type { DashboardData, DashboardVehicle } from '../model/dashboard'
import { DASHBOARD_PERIOD_DAYS, type DashboardFilters } from '../model/dashboard-filters'
import type { DashboardDto, DashboardVehicleDto } from './dashboard-dto'
import { toDashboard, toDashboardVehicle } from './dashboard-mapper'

const CATEGORY_TO_DTO = { light: 'LEVE', heavy: 'PESADO' } as const

export async function fetchDashboard(filters: DashboardFilters): Promise<DashboardData> {
  const params = new URLSearchParams({ dias: String(DASHBOARD_PERIOD_DAYS) })
  if (filters.category !== 'all') params.set('tipo', CATEGORY_TO_DTO[filters.category])
  return toDashboard(await apiFetch<DashboardDto>('/api/dashboard', { searchParams: params }))
}

export async function fetchDashboardVehicles(): Promise<DashboardVehicle[]> {
  return (await apiFetch<DashboardVehicleDto[]>('/api/veiculos')).map(toDashboardVehicle)
}
