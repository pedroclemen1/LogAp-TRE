'use client'

import { Icon } from '@/shared/ui/icon'
import { useTranslations } from 'next-intl'
import { Select } from '@/shared/ui/select'
import { TextInput } from '@/shared/ui/text-input'
import { useTripFiltersController } from '../controllers/use-trip-filters-controller'
import type { TripFilters, TripPageSize } from '../model/trip-filters'
import type { VehicleOption } from '../model/trip'

const CONTROL =
  'h-[36px] rounded-xs border border-outline-variant bg-surface-container-lowest font-body-sm text-body-sm ' +
  'text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary'

export function TripsToolbar({
  pathname,
  filters,
  size,
  vehicles,
}: {
  /** Rota para onde os filtros navegam: '/viagens' ou '/romaneios'. */
  pathname: string
  filters: TripFilters
  size: TripPageSize
  vehicles: readonly VehicleOption[]
}) {
  const t = useTranslations('Trips.toolbar')
  const controller = useTripFiltersController(pathname, filters, size)
  const statusOptions = [
    { value: '', label: t('allStatuses') },
    { value: 'in_progress', label: t('inProgress') },
    { value: 'scheduled', label: t('scheduled') },
    { value: 'completed', label: t('completed') },
    { value: 'canceled', label: t('canceled') },
  ]
  const vehicleOptions = [
    { value: '', label: t('allVehicles') },
    ...vehicles.map((vehicle) => ({ value: String(vehicle.id), label: vehicle.plate })),
  ]

  return (
    <div className="flex flex-col gap-4 rounded-xs border border-outline-variant bg-surface p-4 lg:flex-row lg:items-center">
      <TextInput
        type="search"
        aria-label={t('searchAria')}
        placeholder={t('searchPlaceholder')}
        leadingIcon="search"
        leadingIconClassName="text-[18px]"
        wrapperClassName="w-full lg:max-w-sm"
        className={`${CONTROL} w-full py-2 pl-9 pr-9`}
        defaultValue={filters.search}
        onChange={(event) => controller.changeSearch(event.target.value)}
        trailing={controller.isPending ? (
          <Icon name="progress_activity" aria-label={t('filtering')} className="animate-spin text-[18px] text-on-surface-variant" />
        ) : undefined}
      />
      <div className="hidden h-6 w-px bg-outline-variant lg:block" />
      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto">
        <Select
          aria-label={t('vehicle')}
          options={vehicleOptions}
          value={filters.vehicleId ?? ''}
          onChange={(event) => controller.changeVehicle(event.target.value)}
          wrapperClassName="w-full sm:min-w-40"
          className={`${CONTROL} w-full`}
        />
        <Select
          aria-label={t('tripStatus')}
          options={statusOptions}
          value={filters.status ?? ''}
          onChange={(event) => controller.changeStatus(event.target.value)}
          wrapperClassName="w-full sm:min-w-40"
          className={`${CONTROL} w-full`}
        />
      </div>
    </div>
  )
}
