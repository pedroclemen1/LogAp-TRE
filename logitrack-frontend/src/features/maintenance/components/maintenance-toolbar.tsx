'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'
import { Select } from '@/shared/ui/select'
import { TextInput } from '@/shared/ui/text-input'
import { useMaintenanceFiltersController } from '../controllers/use-maintenance-filters-controller'
import { maintenanceFiltersToQuery, type MaintenanceFilters } from '../model/maintenance-filters'
import type { MaintenanceVehicleOption } from '../model/maintenance'

const CONTROL =
  'h-[36px] rounded-xs border border-outline-variant bg-surface-container-lowest font-body-sm text-body-sm ' +
  'text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary'

export function MaintenanceToolbar({ filters, vehicles }: {
  filters: MaintenanceFilters
  vehicles: readonly MaintenanceVehicleOption[]
}) {
  const t = useTranslations('Maintenance.toolbar')
  const controller = useMaintenanceFiltersController(filters)
  const vehicleOptions = [
    { value: '', label: t('allVehicles') },
    ...vehicles.map((vehicle) => ({ value: String(vehicle.id), label: vehicle.plate })),
  ]
  const statusOptions = [
    { value: '', label: t('allStatuses') },
    { value: 'pending', label: t('pending') },
    { value: 'in_progress', label: t('inProgress') },
    { value: 'completed', label: t('completed') },
    { value: 'overdue', label: t('overdue') },
  ]
  const sortOptions = [
    { value: 'date_asc', label: t('nearestFirst') },
    { value: 'date_desc', label: t('latestFirst') },
    { value: 'cost_desc', label: t('highestCost') },
    { value: 'cost_asc', label: t('lowestCost') },
  ]
  const exportQuery = maintenanceFiltersToQuery(filters)
  exportQuery.set('formato', 'csv')
  const csvHref = `/manutencoes/exportar?${exportQuery}`
  exportQuery.set('formato', 'xls')
  const xlsHref = `/manutencoes/exportar?${exportQuery}`
  const hasFilters = Boolean(
    filters.search || filters.vehicleId || filters.status || filters.startFrom || filters.startTo || filters.sort !== 'date_asc',
  )

  return (
    <div className="space-y-3 rounded-xs border border-outline-variant bg-surface p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <TextInput
          type="search"
          aria-label={t('searchAria')}
          placeholder={t('searchPlaceholder')}
          leadingIcon="search"
          wrapperClassName="w-full xl:max-w-sm"
          className={`${CONTROL} w-full py-2 pl-9 pr-9`}
          defaultValue={filters.search}
          onChange={(event) => controller.changeSearch(event.target.value)}
          trailing={controller.isPending ? (
            <Icon name="progress_activity" aria-label={t('filtering')} className="animate-spin text-[18px] text-on-surface-variant" />
          ) : undefined}
        />

        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 xl:w-auto">
          <Select aria-label={t('vehicle')} options={vehicleOptions} value={filters.vehicleId ?? ''}
            onChange={(event) => controller.changeVehicle(event.target.value)} className={`${CONTROL} w-full`} />
          <Select aria-label={t('maintenanceStatus')} options={statusOptions} value={filters.status ?? ''}
            onChange={(event) => controller.changeStatus(event.target.value)} className={`${CONTROL} w-full`} />
          <Select aria-label={t('sort')} options={sortOptions} value={filters.sort}
            onChange={(event) => controller.changeSort(event.target.value)} className={`${CONTROL} w-full`} />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-outline-variant/60 pt-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="font-body-sm text-body-sm text-on-surface-variant">
            {t('startFrom')}
            <TextInput type="date" value={filters.startFrom ?? ''} max={filters.startTo}
              onChange={(event) => controller.changeStartFrom(event.target.value)} className={`${CONTROL} mt-1 w-full px-3`} />
          </label>
          <label className="font-body-sm text-body-sm text-on-surface-variant">
            {t('startTo')}
            <TextInput type="date" value={filters.startTo ?? ''} min={filters.startFrom}
              onChange={(event) => controller.changeStartTo(event.target.value)} className={`${CONTROL} mt-1 w-full px-3`} />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasFilters && (
            <Button size="sm" onClick={controller.clear}><Icon name="filter_alt_off" className="text-[18px]" /> {t('clear')}</Button>
          )}
          <details className="group relative">
            <summary className="flex h-[36px] cursor-pointer list-none items-center gap-2 rounded-xs border border-outline-variant px-3 text-body-sm text-on-surface-variant hover:bg-surface-container-low">
              <Icon name="download" className="text-[18px]" /> {t('export')}
              <Icon name="expand_more" className="text-[18px] transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 z-30 mt-1 min-w-44 overflow-hidden rounded-xs border border-outline-variant bg-surface shadow-lg">
              <a href={csvHref} download className="flex items-center gap-3 px-4 py-3 text-body-sm hover:bg-surface-container-low">
                <Icon name="description" className="text-[18px] text-primary" /> {t('exportCsv')}
              </a>
              <a href={xlsHref} download className="flex items-center gap-3 border-t border-outline-variant px-4 py-3 text-body-sm hover:bg-surface-container-low">
                <Icon name="table_view" className="text-[18px] text-primary" /> {t('exportXls')}
              </a>
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}
