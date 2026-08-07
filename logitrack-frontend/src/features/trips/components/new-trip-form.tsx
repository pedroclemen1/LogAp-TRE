import { Icon } from '@/shared/ui/icon'
import type { DriverOption, VehicleOption } from '../model/trip'
import { TripForm } from './trip-form'

export function NewTripForm({
  vehicles,
  drivers,
}: {
  vehicles: readonly VehicleOption[]
  drivers: readonly DriverOption[]
}) {
  const t = useTranslations('Trips.new')
  return (
    <div className="mx-auto max-w-4xl space-y-5 lg:space-y-6">
      <div className="flex justify-end">
        <div className="inline-flex items-center gap-2 rounded-xs border border-outline-variant bg-surface-container-low px-3 py-1 font-data-mono text-data-mono text-secondary">
          <Icon name="tag" className="text-[16px]" />
          {t('tag')}
        </div>
      </div>
      <div className="rounded-sm border border-outline-variant bg-surface p-5 sm:p-6">
        <TripForm vehicles={vehicles} drivers={drivers} />
      </div>
    </div>
  )
}
import { useTranslations } from 'next-intl'
