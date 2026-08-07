'use client'

import { useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { formatDecimal } from '@/shared/lib/format'
import { Button } from '@/shared/ui/button'
import { Field, FieldsetLegend } from '@/shared/ui/field'
import { Icon } from '@/shared/ui/icon'
import { IconButton } from '@/shared/ui/icon-button'
import { TextInput } from '@/shared/ui/text-input'
import type { RouteStage } from '../model/trip'
import { TRIP_FORM_CONTROL } from './trip-form-styles'

type StageDraft = {
  key: string
  id?: number
  destination: string
  distanceKm: string
  loadKg: string
  expectedAt: string
}

function initialStages(stages: readonly RouteStage[] | undefined): StageDraft[] {
  if (!stages?.length) {
    return [{ key: 'new-0', destination: '', distanceKm: '', loadKg: '', expectedAt: '' }]
  }
  return stages.map((stage) => ({
    key: `stage-${stage.id}`,
    id: stage.id > 0 ? stage.id : undefined,
    destination: stage.city,
    distanceKm: String(stage.distanceKm),
    loadKg: String(stage.loadKg),
    expectedAt: stage.expectedAt?.slice(0, 16) ?? '',
  }))
}

function routeTotal(stages: readonly StageDraft[]): number {
  return stages.reduce((sum, stage) => {
    const value = Number(stage.distanceKm)
    return sum + (Number.isFinite(value) ? value : 0)
  }, 0)
}

export function TripRouteEditor({
  initialRoute,
  fieldError,
}: {
  initialRoute?: readonly RouteStage[]
  fieldError: (field: string) => string | undefined
}) {
  const t = useTranslations('Trips.form')
  const locale = useLocale()
  const [stages, setStages] = useState<StageDraft[]>(() => initialStages(initialRoute))
  const nextKey = useRef(stages.length)

  function updateStage(index: number, patch: Partial<StageDraft>) {
    setStages((current) => current.map((stage, position) => position === index ? { ...stage, ...patch } : stage))
  }

  function addStage() {
    const key = `new-${nextKey.current++}`
    setStages((current) => [
      ...current,
      { key, destination: '', distanceKm: '', loadKg: '', expectedAt: '' },
    ])
  }

  function moveStage(index: number, direction: -1 | 1) {
    setStages((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const reordered = [...current]
      ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
      return reordered
    })
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <FieldsetLegend>{t('routeSegments')}</FieldsetLegend>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">{t('segmentsHelp')}</p>
        </div>
        <Button size="sm" onClick={addStage} disabled={stages.length >= 30}>
          <Icon name="add_location_alt" className="text-[18px]" /> {t('addStop')}
        </Button>
      </div>

      <input type="hidden" name="trechosQuantidade" value={stages.length} />
      {fieldError('trechos') && (
        <p role="alert" className="font-body-sm text-body-sm text-error">{fieldError('trechos')}</p>
      )}

      <div className="space-y-3">
        {stages.map((stage, index) => {
          const prefix = `trechos[${index}]`
          const origin = index === 0 ? t('tripOrigin') : stages[index - 1].destination || t('stop', { number: index })

          return (
            <div key={stage.key} className="rounded-xs border border-outline-variant bg-surface-container-low/40 p-4">
              <input type="hidden" name={`${prefix}.id`} value={stage.id ?? ''} />
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-on-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-body-sm text-body-sm font-medium text-on-surface">{t('segment', { number: index + 1 })}</p>
                    <p className="truncate text-[11px] text-on-surface-variant">
                      {origin} → {stage.destination || t('destination')}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <IconButton aria-label={t('moveUpAria', { number: index + 1 })} title={t('moveUp')}
                    icon="arrow_upward" iconClassName="text-[17px]" className="h-7 w-7"
                    disabled={index === 0} onClick={() => moveStage(index, -1)} />
                  <IconButton aria-label={t('moveDownAria', { number: index + 1 })} title={t('moveDown')}
                    icon="arrow_downward" iconClassName="text-[17px]" className="h-7 w-7"
                    disabled={index === stages.length - 1} onClick={() => moveStage(index, 1)} />
                  <IconButton aria-label={t('removeAria', { number: index + 1 })} title={t('removeStop')}
                    icon="delete" iconClassName="text-[17px]" className="h-7 w-7 text-error"
                    disabled={stages.length === 1}
                    onClick={() => setStages((current) => current.filter((_, position) => position !== index))} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field htmlFor={`trecho-${index}-destino`} label={t('destination')} error={fieldError(`${prefix}.destino`)}>
                  <TextInput id={`trecho-${index}-destino`} name={`${prefix}.destino`} required maxLength={100}
                    value={stage.destination} onChange={(event) => updateStage(index, { destination: event.target.value })}
                    placeholder={t('destinationPlaceholder')} leadingIcon="flag" className={`${TRIP_FORM_CONTROL} pl-10`} />
                </Field>
                <Field htmlFor={`trecho-${index}-km`} label={t('segmentDistance')} error={fieldError(`${prefix}.kmTrecho`)}>
                  <TextInput id={`trecho-${index}-km`} name={`${prefix}.kmTrecho`} type="number" required min="0.01"
                    step="0.01" inputMode="decimal" value={stage.distanceKm}
                    onChange={(event) => updateStage(index, { distanceKm: event.target.value })}
                    leadingIcon="route" className={`${TRIP_FORM_CONTROL} pl-10 font-data-mono`} />
                </Field>
                <Field htmlFor={`trecho-${index}-carga`} label={t('segmentLoad')} error={fieldError(`${prefix}.cargaKg`)}>
                  <TextInput id={`trecho-${index}-carga`} name={`${prefix}.cargaKg`} type="number" required min="0"
                    step="0.01" inputMode="decimal" value={stage.loadKg}
                    onChange={(event) => updateStage(index, { loadKg: event.target.value })}
                    leadingIcon="weight" className={`${TRIP_FORM_CONTROL} pl-10 font-data-mono`} />
                </Field>
                <Field htmlFor={`trecho-${index}-previsao`} label={t('expectedArrival')} error={fieldError(`${prefix}.previstoEm`)}>
                  <TextInput id={`trecho-${index}-previsao`} name={`${prefix}.previstoEm`} type="datetime-local"
                    value={stage.expectedAt} onChange={(event) => updateStage(index, { expectedAt: event.target.value })}
                    className={`${TRIP_FORM_CONTROL} font-data-mono`} />
                </Field>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xs border border-primary/20 bg-primary/5 px-4 py-3">
        <span className="font-body-sm text-body-sm text-on-surface-variant">{t('segmentCount', { count: stages.length })}</span>
        <span className="font-data-mono text-data-mono font-bold text-primary">
          {t('totalDistance', { distance: formatDecimal(routeTotal(stages), locale) })}
        </span>
      </div>
    </section>
  )
}
