import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import type { Paged } from '@/shared/api/page'
import { formatInteger } from '@/shared/lib/format'
import { paginationWindow } from '@/shared/lib/pagination'
import { buttonClassName } from '@/shared/ui/button-variants'
import { Icon } from '@/shared/ui/icon'
import { PaginationArrow } from '@/shared/ui/pagination'
import { Surface } from '@/shared/ui/surface'
import { TableFooter } from '@/shared/ui/table'
import {
  hasActiveTripFilters,
  tripFiltersToQuery,
  type TripFilters,
  type TripPageSize,
} from '../model/trip-filters'
import type { DriverOption, Trip, VehicleOption } from '../model/trip'
import { TripPageSizeSelect } from './trip-page-size-select'
import { TripsTable } from './trips-table'
import { TripsToolbar } from './trips-toolbar'

const PATHNAME = '/viagens'
const PAGE_BUTTON =
  'flex h-6 w-6 items-center justify-center rounded-xs font-data-mono text-[12px] transition-colors'
function hrefForPage(filters: TripFilters, size: TripPageSize, zeroBasedPage: number): string {
  const query = tripFiltersToQuery(filters, size)
  if (zeroBasedPage > 0) query.set('page', String(zeroBasedPage + 1))
  const search = query.toString()
  return search ? `${PATHNAME}?${search}` : PATHNAME
}

type TripsScreenProps = {
  trips: Paged<Trip>
  filters: TripFilters
  size: TripPageSize
  vehicles: readonly VehicleOption[]
  drivers: readonly DriverOption[]
}

export function TripsScreen({ trips, filters, size, vehicles, drivers }: TripsScreenProps) {
  const t = useTranslations('Trips.screen')
  const locale = useLocale()
  const pages = paginationWindow(trips.page, trips.totalPages)
  const hasMoreAhead = pages.length > 0 && pages[pages.length - 1] < trips.totalPages - 1
  const rangeLabel = trips.totalItems === 0
    ? (hasActiveTripFilters(filters) ? t('noMatches') : t('noneRegistered'))
    : trips.items.length === 0
      ? t('noneOnPage', { page: formatInteger(trips.page + 1, locale) })
      : t('range', {
          first: formatInteger(trips.firstItem, locale),
          last: formatInteger(trips.lastItem, locale),
          total: formatInteger(trips.totalItems, locale),
        })

  return (
    <div className="space-y-5 lg:space-y-6">
      <div className="flex justify-stretch sm:justify-end">
        <Link href="/viagens/nova" className={buttonClassName('primary', 'md', 'w-full sm:w-auto')}>
          <Icon name="add" className="text-[18px]" />
          {t('newTrip')}
        </Link>
      </div>

      <TripsToolbar pathname="/viagens" filters={filters} size={size} vehicles={vehicles} />

      <Surface className="overflow-hidden shadow-sm">
        <TripsTable trips={trips.items} vehicles={vehicles} drivers={drivers} />

        <TableFooter className="gap-3 px-4 py-2">
          <TripPageSizeSelect pathname="/viagens" filters={filters} size={size} />

          <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {rangeLabel}
            </span>
            <div className="flex items-center gap-1">
              <PaginationArrow
                direction="previous"
                href={trips.isFirst ? undefined : hrefForPage(filters, size, trips.page - 1)}
                className="p-1 text-on-surface-variant hover:text-on-surface"
              />

              {pages.map((page) => (
                <Link
                  key={page}
                  href={hrefForPage(filters, size, page)}
                  aria-current={page === trips.page ? 'page' : undefined}
                  className={`${PAGE_BUTTON} ${
                    page === trips.page
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  {formatInteger(page + 1, locale)}
                </Link>
              ))}

              {hasMoreAhead && <span className="px-1 text-on-surface-variant">...</span>}

              <PaginationArrow
                direction="next"
                href={trips.isLast ? undefined : hrefForPage(filters, size, trips.page + 1)}
                className="p-1 text-on-surface-variant hover:text-on-surface"
              />
            </div>
          </div>
        </TableFooter>
      </Surface>
    </div>
  )
}
