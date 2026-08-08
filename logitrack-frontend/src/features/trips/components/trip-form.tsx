'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Alert } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { buttonClassName } from '@/shared/ui/button-variants'
import { dateTimeBounds } from '@/shared/lib/date-window'
import { Field, FieldsetLegend } from '@/shared/ui/field'
import { Icon } from '@/shared/ui/icon'
import { Select } from '@/shared/ui/select'
import { TextInput } from '@/shared/ui/text-input'
import { useTripFormController } from '../controllers/use-trip-form-controller'
import type { DriverOption, RouteStage, Trip, VehicleOption } from '../model/trip'
import { TRIP_FORM_CONTROL } from './trip-form-styles'
import { TripRouteEditor } from './trip-route-editor'

/**
 * Calculado uma vez por carregamento do modulo. A janela e de anos; recalcular
 * a cada render nao mudaria o valor e faria o atributo oscilar sem motivo.
 */
const DATE_TIME_BOUNDS = dateTimeBounds()

type TripFormProps = {
  vehicles: readonly VehicleOption[]
  drivers: readonly DriverOption[]
  trip?: Trip
  stages?: readonly RouteStage[]
  onSuccess?: () => void
  onCancel?: () => void
}

export function TripForm({ vehicles, drivers, trip, stages, onSuccess, onCancel }: TripFormProps) {
  const t = useTranslations('Trips.form')
  const controller = useTripFormController(trip, onSuccess)
  const editing = trip !== undefined
  const assignableVehicles = vehicles.filter((vehicle) => (
    vehicle.operationalStatus === 'available' || vehicle.id === trip?.vehicleId
  ))
  const unavailableVehicles = vehicles.filter((vehicle) => (
    vehicle.operationalStatus !== 'available' && vehicle.id !== trip?.vehicleId
  ))
  const assignableDrivers = drivers.filter((driver) => !driver.inUse || driver.id === trip?.driverId)
  const unavailableDrivers = drivers.filter((driver) => driver.inUse && driver.id !== trip?.driverId)
  const vehicleOptions = [
    { value: '', label: t('selectVehicle') },
    ...assignableVehicles.map((vehicle) => ({ value: String(vehicle.id), label: vehicle.label })),
  ]
  const driverOptions = [
    { value: '', label: t('noDriver') },
    ...assignableDrivers.map((driver) => ({ value: String(driver.id), label: driver.name })),
  ]

  return (
    <form action={controller.formAction} className="space-y-7">
      <section className="space-y-4">
        <FieldsetLegend>{t('vehicleAssignment')}</FieldsetLegend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field htmlFor="veiculoId" label={t('assignedUnit')} error={controller.fieldError('veiculoId')}>
            <Select id="veiculoId" name="veiculoId" required options={vehicleOptions}
              defaultValue={controller.submittedValue('veiculoId')} className={TRIP_FORM_CONTROL} wrapperClassName="w-full" />
          </Field>
          <Field htmlFor="motoristaId" label={t('driver')} error={controller.fieldError('motoristaId')}>
            <Select id="motoristaId" name="motoristaId" options={driverOptions}
              defaultValue={controller.submittedValue('motoristaId')} className={TRIP_FORM_CONTROL} wrapperClassName="w-full" />
          </Field>
        </div>

        {unavailableVehicles.length > 0 && (
          <Alert tone="warning" title={t('someVehiclesUnavailable')}>
            <p>{t('vehiclesHidden')}</p>
            <ul className="mt-1 space-y-0.5 font-body-sm text-body-sm text-on-surface">
              {unavailableVehicles.map((vehicle) => (
                <li key={vehicle.id}>
                  <span className="font-data-mono font-bold">{vehicle.plate}</span>
                  {' — '}{vehicle.model}: {vehicle.operationalStatus === 'maintenance' ? t('maintenanceInProgress') : t('tripInProgress')}
                </li>
              ))}
            </ul>
          </Alert>
        )}

        {unavailableDrivers.length > 0 && (
          <Alert tone="warning" title={t('someDriversUnavailable')}>
            <p>{t('driversHidden')}</p>
            <ul className="mt-1 space-y-0.5 text-on-surface">
              {unavailableDrivers.map((driver) => <li key={driver.id}>{driver.name}</li>)}
            </ul>
          </Alert>
        )}
      </section>

      <section className="space-y-4">
        <FieldsetLegend>{t('routeOrigin')}</FieldsetLegend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field htmlFor="origem" label={t('originNode')} error={controller.fieldError('origem')}>
            <TextInput id="origem" name="origem" required maxLength={100} placeholder={t('originPlaceholder')}
              leadingIcon="location_on" defaultValue={controller.submittedValue('origem')}
              className={`${TRIP_FORM_CONTROL} pl-10`} />
          </Field>
          <Field htmlFor="dataSaida" label={t('scheduledDeparture')} error={controller.fieldError('dataSaida')}>
            <TextInput id="dataSaida" name="dataSaida" type="datetime-local" required
              min={DATE_TIME_BOUNDS.min} max={DATE_TIME_BOUNDS.max}
              defaultValue={controller.submittedValue('dataSaida')}
              className={`${TRIP_FORM_CONTROL} font-data-mono`} />
          </Field>
        </div>
      </section>

      <TripRouteEditor initialRoute={stages} fieldError={controller.fieldError} />

      {controller.errorMessage && (
        <p role="alert" className="rounded-xs bg-error-container px-3 py-2 font-body-sm text-body-sm text-on-error-container">
          {controller.errorMessage}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-outline-variant pt-5 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel} disabled={controller.isSubmitting}>{t('cancel')}</Button>
        ) : (
          <Link href="/viagens" className={buttonClassName('secondary')}>{t('cancel')}</Link>
        )}
        <Button type="submit" variant="primary" disabled={controller.isSubmitting}>
          <Icon name="save" className="text-[18px]" />
          {controller.isSubmitting ? t('saving') : editing ? t('saveChanges') : t('saveDetails')}
        </Button>
      </div>
    </form>
  )
}
