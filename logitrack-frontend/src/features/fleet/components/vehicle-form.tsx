'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/shared/ui/button'
import { Field } from '@/shared/ui/field'
import { Select } from '@/shared/ui/select'
import { TextInput } from '@/shared/ui/text-input'
import { useVehicleFormController } from '../controllers/use-vehicle-form-controller'
import type { FleetVehicle } from '../model/vehicle'

const CONTROL =
  'w-full h-10 px-3 bg-surface-container-lowest text-on-surface rounded-xs border border-outline-variant ' +
  'font-body-sm text-body-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary'

type VehicleFormProps = {
  vehicle?: FleetVehicle
  onSuccess: () => void
  onCancel: () => void
}

export function VehicleForm({ vehicle, onSuccess, onCancel }: VehicleFormProps) {
  const t = useTranslations('Fleet.form')
  const { formAction, isSubmitting, errorMessage, fieldError, submittedValue } =
    useVehicleFormController(vehicle, onSuccess)
  const editing = vehicle !== undefined
  const typeOptions = [
    { value: '', label: t('selectCategory') },
    { value: 'LEVE', label: t('light') },
    { value: 'PESADO', label: t('heavy') },
  ]

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field htmlFor="placa" label={t('plate')} error={fieldError('placa')}>
          <TextInput
            id="placa"
            name="placa"
            required
            maxLength={10}
            autoComplete="off"
            placeholder="ABC-1234"
            defaultValue={submittedValue('placa')}
            className={`${CONTROL} font-data-mono uppercase`}
          />
        </Field>

        <Field htmlFor="modelo" label={t('model')} error={fieldError('modelo')}>
          <TextInput
            id="modelo"
            name="modelo"
            required
            maxLength={50}
            autoComplete="off"
            placeholder="Volvo FH"
            defaultValue={submittedValue('modelo')}
            className={CONTROL}
          />
        </Field>

        <Field htmlFor="tipo" label={t('category')} error={fieldError('tipo')}>
          <Select
            id="tipo"
            name="tipo"
            required
            options={typeOptions}
            defaultValue={submittedValue('tipo')}
            className={CONTROL}
          />
        </Field>

        <Field htmlFor="ano" label={t('year')} error={fieldError('ano')}>
          <TextInput
            id="ano"
            name="ano"
            type="number"
            required
            min={1950}
            max={2100}
            step={1}
            inputMode="numeric"
            placeholder="2023"
            defaultValue={submittedValue('ano')}
            className={`${CONTROL} font-data-mono`}
          />
        </Field>
      </div>

      <Field htmlFor="kmInicial" label={t('odometer')} error={fieldError('kmInicial')}>
        <TextInput
          id="kmInicial"
          name="kmInicial"
          type="number"
          required
          min={0}
          step="0.01"
          inputMode="decimal"
          placeholder="0"
          defaultValue={submittedValue('kmInicial')}
          className={`${CONTROL} font-data-mono`}
        />
        <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
          {editing ? t('odometerEditHelp') : t('odometerCreateHelp')}
        </p>
      </Field>

      {errorMessage && (
        <p role="alert" className="font-body-sm text-body-sm text-error">
          {errorMessage}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          {t('cancel')}
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? t('saving') : editing ? t('saveChanges') : t('saveVehicle')}
        </Button>
      </div>
    </form>
  )
}
