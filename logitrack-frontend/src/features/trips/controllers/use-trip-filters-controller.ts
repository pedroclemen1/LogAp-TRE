'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { useDebouncedCallback } from '@/shared/hooks/use-debounced-callback'
import {
  asTripStatus,
  asVehicleId,
  parseTripPageSize,
  tripFiltersToQuery,
  type TripFilters,
  type TripPageSize,
} from '../model/trip-filters'

const SEARCH_DEBOUNCE_MS = 350

/**
 * Filtros de viagem, com o estado na URL.
 *
 * `pathname` e parametro porque a tela de Romaneios lista as MESMAS viagens com
 * os mesmos filtros — fixar '/viagens' aqui obrigaria a duplicar o controller
 * inteiro so para trocar a rota de destino.
 */
export function useTripFiltersController(
  pathname: string,
  filters: TripFilters,
  size: TripPageSize,
) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const navigate = useCallback((nextFilters: TripFilters, nextSize: TripPageSize = size) => {
    const query = tripFiltersToQuery(nextFilters, nextSize).toString()
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname))
  }, [pathname, router, size])

  const changeSearch = useDebouncedCallback(
    (value: string) => navigate({ ...filters, search: value.trim() }),
    SEARCH_DEBOUNCE_MS,
  )

  const changeStatus = useCallback((value: string) => {
    navigate({ ...filters, status: asTripStatus(value) })
  }, [filters, navigate])

  const changeVehicle = useCallback((value: string) => {
    navigate({ ...filters, vehicleId: asVehicleId(value) })
  }, [filters, navigate])

  const changeSize = useCallback((value: string) => {
    navigate(filters, parseTripPageSize(value))
  }, [filters, navigate])

  return { isPending, changeSearch, changeStatus, changeVehicle, changeSize }
}
