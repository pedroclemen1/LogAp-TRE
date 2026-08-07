'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { useDebouncedCallback } from '@/shared/hooks/use-debounced-callback'
import {
  RECORD_STATUSES,
  referenceFiltersToQuery,
  type RecordStatus,
  type ReferenceFilters,
} from '../model/reference-data'

const SEARCH_DEBOUNCE_MS = 350

export function useReferenceFiltersController(pathname: string, filters: ReferenceFilters) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const navigate = useCallback((next: ReferenceFilters) => {
    const query = referenceFiltersToQuery(next).toString()
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname))
  }, [pathname, router])

  const changeSearch = useDebouncedCallback(
    (value: string) => navigate({ ...filters, search: value.trim() }),
    SEARCH_DEBOUNCE_MS,
  )

  const changeStatus = useCallback((value: string) => {
    const status = RECORD_STATUSES.find((option) => option === value) as RecordStatus | undefined
    navigate({ ...filters, status: status ?? 'active' })
  }, [filters, navigate])

  return { isPending, changeSearch, changeStatus }
}
