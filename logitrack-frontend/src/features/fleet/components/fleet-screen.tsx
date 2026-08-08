import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import type { Paged } from '@/shared/api/page'
import { paginationWindow } from '@/shared/lib/pagination'
import { PaginationArrow } from '@/shared/ui/pagination'
import { Surface } from '@/shared/ui/surface'
import { TableFooter } from '@/shared/ui/table'
import { formatInteger } from '@/shared/lib/format'
import { fleetFiltersToQuery, hasActiveFleetFilters, type FleetFilters } from '../model/fleet-filters'
import type { FleetVehicle } from '../model/vehicle'
import { AddVehicleDialog } from './add-vehicle-dialog'
import { FleetTable } from './fleet-table'
import { FleetToolbar } from './fleet-toolbar'

const PATHNAME = '/frota'

const PAGE_BUTTON =
  'w-6 h-6 flex items-center justify-center rounded-xs font-data-mono text-[12px] transition-colors'

function hrefForPage(filters: FleetFilters, zeroBasedPage: number): string {
  const query = fleetFiltersToQuery(filters)
  if (zeroBasedPage > 0) query.set('page', String(zeroBasedPage + 1))

  const search = query.toString()
  return search ? `${PATHNAME}?${search}` : PATHNAME
}

type FleetScreenProps = {
  fleet: Paged<FleetVehicle>
  filters: FleetFilters
  canManage: boolean
}

export function FleetScreen({ fleet, filters, canManage }: FleetScreenProps) {
  const t = useTranslations('Fleet.pagination')
  const locale = useLocale()
  const pages = paginationWindow(fleet.page, fleet.totalPages)
  const hasMoreAhead = pages.length > 0 && pages[pages.length - 1] < fleet.totalPages - 1

  const exportParams = fleetFiltersToQuery(filters)
  exportParams.set('formato', 'csv')
  const exportCsvHref = `${PATHNAME}/exportar?${exportParams}`
  exportParams.set('formato', 'xls')
  const exportXlsHref = `${PATHNAME}/exportar?${exportParams}`
  const rangeLabel = fleet.totalItems === 0
    ? hasActiveFleetFilters(filters) ? t('noMatches') : t('noneRegistered')
    : fleet.items.length === 0
      ? t('emptyPage', { page: formatInteger(fleet.page + 1, locale) })
      : t('range', {
          first: formatInteger(fleet.firstItem, locale),
          last: formatInteger(fleet.lastItem, locale),
          total: formatInteger(fleet.totalItems, locale),
        })

  return (
    <div className="space-y-5 lg:space-y-6">
      {canManage && (
        <div className="flex justify-stretch sm:justify-end">
          <AddVehicleDialog />
        </div>
      )}

      <FleetToolbar filters={filters} exportCsvHref={exportCsvHref} exportXlsHref={exportXlsHref} />

      <Surface className="overflow-hidden shadow-sm">
        <FleetTable vehicles={fleet.items} canManage={canManage} />

        <TableFooter className="px-4 py-2">
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {rangeLabel}
          </span>

          <div className="flex items-center gap-1">
            <PaginationArrow
              direction="previous"
              href={fleet.isFirst ? undefined : hrefForPage(filters, fleet.page - 1)}
              className="p-1 text-on-surface-variant hover:text-on-surface"
            />

            {pages.map((page) => (
              <Link
                key={page}
                href={hrefForPage(filters, page)}
                aria-current={page === fleet.page ? 'page' : undefined}
                className={`${PAGE_BUTTON} ${
                  page === fleet.page
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                {formatInteger(page + 1, locale)}
              </Link>
            ))}

            {hasMoreAhead && <span className="text-on-surface-variant px-1">...</span>}

            <PaginationArrow
              direction="next"
              href={fleet.isLast ? undefined : hrefForPage(filters, fleet.page + 1)}
              className="p-1 text-on-surface-variant hover:text-on-surface"
            />
          </div>
        </TableFooter>
      </Surface>
    </div>
  )
}
