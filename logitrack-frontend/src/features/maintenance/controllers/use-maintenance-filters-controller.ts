'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useTransition } from 'react'
import { useDebouncedCallback } from '@/shared/hooks/use-debounced-callback'
import {
  MAINTENANCE_FILTER_STATUSES,
  MAINTENANCE_SORTS,
  maintenanceFiltersToQuery,
  type MaintenanceFilterStatus,
  type MaintenanceFilters,
  type MaintenanceSort,
} from '../model/maintenance-filters'

const PATHNAME = '/manutencoes'
const SEARCH_DEBOUNCE_MS = 350

export function useMaintenanceFiltersController(filters: MaintenanceFilters) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const currentFilters = useRef(filters)

  useEffect(() => {
    currentFilters.current = filters
  }, [filters])

  const navigate = useCallback((next: MaintenanceFilters) => {
    currentFilters.current = next
    const query = maintenanceFiltersToQuery(next).toString()
    startTransition(() => router.replace(query ? `${PATHNAME}?${query}` : PATHNAME))
  }, [router])

  const changeSearch = useDebouncedCallback(
    (value: string) => navigate({ ...currentFilters.current, search: value.trim() }),
    SEARCH_DEBOUNCE_MS,
  )

  const changeVehicle = useCallback((value: string) => {
    const id = Number(value)
    navigate({ ...currentFilters.current, vehicleId: Number.isInteger(id) && id > 0 ? id : undefined })
  }, [navigate])

  const changeStatus = useCallback((value: string) => {
    navigate({
      ...currentFilters.current,
      status: MAINTENANCE_FILTER_STATUSES.includes(value as MaintenanceFilterStatus)
        ? value as MaintenanceFilterStatus
        : undefined,
    })
  }, [navigate])

  const changeSort = useCallback((value: string) => {
    navigate({
      ...currentFilters.current,
      sort: MAINTENANCE_SORTS.includes(value as MaintenanceSort) ? value as MaintenanceSort : 'date_asc',
    })
  }, [navigate])

  const changeDate = useCallback((field: 'startFrom' | 'startTo', value: string) => {
    const next = { ...currentFilters.current, [field]: value || undefined }
    if (field === 'startFrom' && next.startFrom && next.startTo && next.startTo < next.startFrom) {
      next.startTo = undefined
    }
    if (field === 'startTo' && next.startFrom && next.startTo && next.startTo < next.startFrom) {
      next.startFrom = undefined
    }
    navigate(next)
  }, [navigate])

  return {
    isPending,
    changeSearch,
    changeVehicle,
    changeStatus,
    changeSort,
    changeStartFrom: (value: string) => changeDate('startFrom', value),
    changeStartTo: (value: string) => changeDate('startTo', value),
    clear: () => navigate({ search: '', sort: 'date_asc' }),
  }
}
