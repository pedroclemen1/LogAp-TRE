'use client'

import { useTranslations } from 'next-intl'
import { useTripFiltersController } from '../controllers/use-trip-filters-controller'
import type { TripFilters, TripPageSize } from '../model/trip-filters'

export function TripPageSizeSelect({
  pathname,
  filters,
  size,
}: {
  pathname: string
  filters: TripFilters
  size: TripPageSize
}) {
  const t = useTranslations('Trips.pagination')
  const controller = useTripFiltersController(pathname, filters, size)
  return (
    <label className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
      {t('rowsPerPage')}
      <select
        aria-label={t('rowsPerPageAria')}
        value={size}
        onChange={(event) => controller.changeSize(event.target.value)}
        className="cursor-pointer border-none bg-transparent py-1 pr-6 font-body-sm text-body-sm text-on-surface focus:ring-0"
      >
        <option value="10">10</option>
        <option value="25">25</option>
        <option value="50">50</option>
      </select>
    </label>
  )
}
