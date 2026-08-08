'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/shared/ui/button'
import { Alert } from '@/shared/ui/alert'
import { useEventCallback } from '@/shared/hooks/use-event-callback'
import { Field, FieldsetLegend } from '@/shared/ui/field'
import { Icon } from '@/shared/ui/icon'
import { IconButton } from '@/shared/ui/icon-button'
import { Select } from '@/shared/ui/select'
import { TextInput } from '@/shared/ui/text-input'
import { useToast } from '@/shared/ui/use-toast'
import { dateBounds } from '@/shared/lib/date-window'
import { formatCurrency } from '@/shared/lib/format'
import { createMaintenanceAction, updateMaintenanceAction } from '../actions'
import { builtInMaintenanceServiceKey } from '../lib/maintenance-service-name'
import { EMPTY_MAINTENANCE_FORM_STATE, type MaintenanceFormState } from '../model/maintenance-form'
import type { MaintenanceCatalogService, MaintenanceOrder, MaintenanceVehicleOption } from '../model/maintenance'

const CONTROL =
  'block h-10 w-full rounded-xs border border-outline-variant bg-surface-container-lowest px-3 ' +
  'font-body-sm text-body-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary ' +
  'disabled:cursor-not-allowed disabled:bg-surface-container-high disabled:text-on-surface-variant'

/** Mesma janela do backend; ver `shared/lib/date-window`. */
const DATE_BOUNDS = dateBounds()

type ServiceDraft = {
  key: string
  id?: number
  serviceId: string
  cost: string
  historicalName?: string
}

type FormAction = (state: MaintenanceFormState, data: FormData) => Promise<MaintenanceFormState>

const VEHICLE_STATUS = {
  available: { tone: 'border-[#CEEAD6] bg-[#E6F4EA] text-[#137333]' },
  in_use: { tone: 'border-[#FEEFC3] bg-[#FEF7E0] text-[#B06000]' },
  maintenance: { tone: 'border-[#FAD2CF] bg-[#FCE8E6] text-[#C5221F]' },
} as const

function initialServices(maintenance?: MaintenanceOrder): ServiceDraft[] {
  if (!maintenance) return [{ key: 'new-0', serviceId: '', cost: '' }]
  return maintenance.services.map((service) => ({
    key: `item-${service.id}`,
    id: service.id,
    serviceId: String(service.serviceId),
    cost: String(service.cost),
    historicalName: service.name,
  }))
}

export function MaintenanceForm({ maintenance, vehicles, catalog, onSuccess, onCancel }: {
  maintenance?: MaintenanceOrder
  vehicles: readonly MaintenanceVehicleOption[]
  catalog: readonly MaintenanceCatalogService[]
  onSuccess: () => void
  onCancel: () => void
}) {
  const t = useTranslations('Maintenance.form')
  const serviceNames = useTranslations('Maintenance.serviceNames')
  const locale = useLocale()
  const editing = maintenance !== undefined
  const { showToast } = useToast()
  const locked = maintenance?.status === 'in_progress'
  const action = useMemo<FormAction>(
    () => maintenance ? updateMaintenanceAction.bind(null, maintenance.id) : createMaintenanceAction,
    [maintenance],
  )
  const [state, formAction, isSubmitting] = useActionState<MaintenanceFormState, FormData>(
    action,
    EMPTY_MAINTENANCE_FORM_STATE,
  )
  const [vehicleId, setVehicleId] = useState(String(maintenance?.vehicleId ?? ''))
  const [services, setServices] = useState<ServiceDraft[]>(() => initialServices(maintenance))
  const nextKey = useRef(services.length)
  const emitSuccess = useEventCallback(onSuccess)
  const handledState = useRef<MaintenanceFormState>(undefined)

  // Identidade estavel + marca do estado ja tratado. Ver `use-event-callback`:
  // sem isso, o `onSuccess` inline do chamador reentra no efeito a cada render
  // e o `router.refresh()` vira laco infinito.
  useEffect(() => {
    if (handledState.current === state) return
    handledState.current = state

    if (state.status === 'success') emitSuccess()
    if (state.status === 'error' && state.message) {
      showToast({ tone: 'error', title: t('saveFailed'), description: state.message })
    }
  }, [state, emitSuccess, showToast, t])

  const availableVehicles = vehicles.filter((vehicle) => vehicle.status !== 'maintenance' || vehicle.id === maintenance?.vehicleId)
  const selectedVehicle = availableVehicles.find((vehicle) => String(vehicle.id) === vehicleId)
  const vehicleOptions = [
    { value: '', label: t('selectVehicle') },
    ...availableVehicles.map((vehicle) => ({
      value: String(vehicle.id),
      label: `${vehicle.label} — ${t(`vehicleStatus.${vehicle.status}`)}`,
    })),
  ]
  const canCreate = availableVehicles.length > 0 && catalog.length > 0

  function displayServiceName(name: string): string {
    const key = builtInMaintenanceServiceKey(name)
    return key ? serviceNames(key) : name
  }

  function serviceOptions(draft: ServiceDraft) {
    const selectedElsewhere = new Set(services.filter((item) => item.key !== draft.key).map((item) => item.serviceId))
    const options = catalog
      .filter((service) => !selectedElsewhere.has(String(service.id)))
      .map((service) => ({ value: String(service.id), label: displayServiceName(service.name) }))
    if (draft.serviceId && !options.some((option) => option.value === draft.serviceId)) {
      options.push({ value: draft.serviceId, label: t('inactiveService', { name: displayServiceName(draft.historicalName ?? t('historicalService')) }) })
    }
    return [{ value: '', label: t('selectService') }, ...options]
  }

  function updateService(key: string, patch: Partial<ServiceDraft>) {
    setServices((current) => current.map((service) => service.key === key ? { ...service, ...patch } : service))
  }

  function addService() {
    const key = `new-${nextKey.current++}`
    setServices((current) => [...current, { key, serviceId: '', cost: '' }])
  }

  const total = services.reduce((sum, service) => {
    const cost = Number(service.cost)
    return sum + (Number.isFinite(cost) ? cost : 0)
  }, 0)

  return (
    <form action={formAction} className="space-y-6">
      {!editing && availableVehicles.length === 0 && (
        <Alert tone="warning" title={t('noVehiclesTitle')}>{t('noVehiclesBody')}</Alert>
      )}
      {!editing && catalog.length === 0 && (
        <Alert tone="warning" title={t('noServicesTitle')}>{t('noServicesBody')}</Alert>
      )}
      <FieldsetLegend>{t('window')}</FieldsetLegend>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field htmlFor="veiculoId" label={t('vehicle')} error={state.fieldErrors?.veiculoId}>
          {locked && <input type="hidden" name="veiculoId" value={maintenance.vehicleId} />}
          <Select id="veiculoId" name={locked ? undefined : 'veiculoId'} required disabled={locked}
            options={vehicleOptions} value={vehicleId} onChange={(event) => setVehicleId(event.target.value)} className={CONTROL} />
          {selectedVehicle && (
            <span className={`mt-1.5 inline-flex rounded-xs border px-2 py-0.5 text-[10px] font-bold ${VEHICLE_STATUS[selectedVehicle.status].tone}`}>
              {t(`vehicleStatus.${selectedVehicle.status}`)}
            </span>
          )}
        </Field>
        <Field htmlFor="dataInicioPrevista" label={t('plannedStart')} error={state.fieldErrors?.dataInicioPrevista}>
          {locked && <input type="hidden" name="dataInicioPrevista" value={maintenance.plannedStart} />}
          <TextInput id="dataInicioPrevista" name={locked ? undefined : 'dataInicioPrevista'} type="date" required disabled={locked}
            min={DATE_BOUNDS.min} max={DATE_BOUNDS.max}
            defaultValue={maintenance?.plannedStart ?? ''} className={`${CONTROL} font-data-mono`} />
        </Field>
        <Field htmlFor="dataFinalizacaoPrevista" label={t('plannedFinish')} error={state.fieldErrors?.dataFinalizacaoPrevista}>
          <TextInput id="dataFinalizacaoPrevista" name="dataFinalizacaoPrevista" type="date" required
            min={DATE_BOUNDS.min} max={DATE_BOUNDS.max}
            defaultValue={maintenance?.plannedFinish ?? ''} className={`${CONTROL} font-data-mono`} />
        </Field>
      </div>

      {!editing && selectedVehicle?.status === 'in_use' && (
        <Alert tone="warning" title={t('vehicleInTripTitle', { plate: selectedVehicle.plate })}>
          {t('vehicleInTripBody')}
        </Alert>
      )}

      <div className="flex flex-col justify-between gap-3 border-b border-outline-variant pb-2 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-label-caps text-label-caps uppercase text-on-surface-variant">{t('serviceItems')}</h3>
          <p className="mt-1 text-body-sm text-on-surface-variant">{t('serviceItemsHelp')}</p>
        </div>
        {!locked && (
          <Button size="sm" onClick={addService} disabled={services.length >= Math.min(30, catalog.length)}>
            <Icon name="add" className="text-[18px]" /> {t('addService')}
          </Button>
        )}
      </div>

      <input type="hidden" name="servicosQuantidade" value={services.length} />
      {state.fieldErrors?.servicos && <p role="alert" className="text-body-sm text-error">{state.fieldErrors.servicos}</p>}
      <div className="space-y-3">
        {services.map((service, index) => {
          const prefix = `servicos[${index}]`
          return (
            <div key={service.key} className="grid grid-cols-1 items-end gap-3 rounded-xs border border-outline-variant bg-surface-container-low/40 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(130px,0.35fr)_auto]">
              <input type="hidden" name={`${prefix}.id`} value={service.id ?? ''} />
              <Field htmlFor={`${prefix}.servicoId`} label={t('serviceNumber', { number: index + 1 })} error={state.fieldErrors?.[`${prefix}.servicoId`]}>
                {locked && <input type="hidden" name={`${prefix}.servicoId`} value={service.serviceId} />}
                <Select id={`${prefix}.servicoId`} name={locked ? undefined : `${prefix}.servicoId`} required disabled={locked}
                  options={serviceOptions(service)} value={service.serviceId}
                  onChange={(event) => updateService(service.key, { serviceId: event.target.value })} className={CONTROL} />
              </Field>
              <Field htmlFor={`${prefix}.custo`} label={t('cost')} error={state.fieldErrors?.[`${prefix}.custo`]}>
                <TextInput id={`${prefix}.custo`} name={`${prefix}.custo`} type="number" required min={0} step="0.01"
                  value={service.cost} onChange={(event) => updateService(service.key, { cost: event.target.value })}
                  className={`${CONTROL} font-data-mono`} />
              </Field>
              {!locked && (
                <IconButton aria-label={t('removeServiceAria', { number: index + 1 })} title={t('remove')} icon="delete"
                  className="mb-0.5 h-9 w-9 justify-self-end text-error" disabled={services.length === 1}
                  onClick={() => setServices((current) => current.filter((item) => item.key !== service.key))} />
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between rounded-xs border border-outline-variant bg-surface-container-low px-4 py-3">
        <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">{t('orderTotal')}</span>
        <span className="font-data-mono text-title-md font-bold text-on-surface">{formatCurrency(total, locale)}</span>
      </div>

      {state.message && <p role="alert" className="rounded-xs bg-error-container px-3 py-2 text-body-sm text-on-error-container">{state.message}</p>}

      <div className="flex justify-end gap-2">
        <Button onClick={onCancel} disabled={isSubmitting}>{t('cancel')}</Button>
        <Button type="submit" variant="primary" disabled={isSubmitting || (!editing && !canCreate)}>
          {isSubmitting ? t('saving') : editing ? t('saveChanges') : t('schedule')}
        </Button>
      </div>
    </form>
  )
}
