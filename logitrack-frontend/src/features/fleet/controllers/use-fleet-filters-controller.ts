'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { useDebouncedCallback } from '@/shared/hooks/use-debounced-callback'
import {
  asVehicleCategory,
  asVehicleStatus,
  fleetFiltersToQuery,
  type FleetFilters,
} from '../model/fleet-filters'

const PATHNAME = '/frota'

const SEARCH_DEBOUNCE_MS = 350

/**
 * Orquestra os filtros da Frota. Nao retorna JSX e nao conhece Tailwind.
 *
 * O estado nao vive aqui: vive na URL. Cada alteracao navega, o servidor
 * re-renderiza com os dados filtrados e os valores atuais voltam por prop. Por
 * isso o controller recebe `filters` em vez de ler `useSearchParams` — ler os
 * parametros no cliente forcaria a pagina inteira a renderizar no navegador.
 *
 * `replace` e nao `push`: cada tecla digitada viraria uma entrada no historico
 * e o botao de voltar exigiria um clique por letra.
 */
export function useFleetFiltersController(filters: FleetFilters) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const navigate = useCallback(
    (next: FleetFilters) => {
      // A pagina e omitida de proposito: filtrar tem de voltar para a primeira,
      // senao aplicar um filtro na pagina 3 mostraria uma tabela vazia.
      const query = fleetFiltersToQuery(next).toString()
      startTransition(() => router.replace(query ? `${PATHNAME}?${query}` : PATHNAME))
    },
    [router],
  )

  const changeSearch = useDebouncedCallback(
    (value: string) => navigate({ ...filters, search: value.trim() }),
    SEARCH_DEBOUNCE_MS,
  )

  const changeCategory = useCallback(
    (value: string) => navigate({ ...filters, category: asVehicleCategory(value) }),
    [filters, navigate],
  )

  const changeStatus = useCallback(
    (value: string) => navigate({ ...filters, status: asVehicleStatus(value) }),
    [filters, navigate],
  )

  return { isPending, changeSearch, changeCategory, changeStatus }
}
