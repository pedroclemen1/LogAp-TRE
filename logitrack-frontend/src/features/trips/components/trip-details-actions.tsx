'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { formatDecimal } from '@/shared/lib/format'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'
import { Modal } from '@/shared/ui/modal'
import { useToast } from '@/shared/ui/use-toast'
import { cancelTripAction, finishTripAction, startTripAction } from '../actions'
import type { DriverOption, RouteStage, Trip, VehicleOption } from '../model/trip'
import { TripForm } from './trip-form'

type Confirmation = 'cancel' | 'finish' | 'start'

export function TripDetailsActions({
  trip,
  stages,
  vehicles,
  drivers,
}: {
  trip: Trip
  stages: readonly RouteStage[]
  vehicles: readonly VehicleOption[]
  drivers: readonly DriverOption[]
}) {
  const t = useTranslations('Trips.detailsActions')
  const locale = useLocale()
  const router = useRouter()
  const { showToast } = useToast()
  const [editing, setEditing] = useState(false)
  const [confirmation, setConfirmation] = useState<Confirmation>()
  const [error, setError] = useState<string>()
  const [isPending, startTransition] = useTransition()
  const canEdit = trip.status === 'scheduled' || trip.status === 'in_progress'
  const canCancel = trip.status === 'scheduled' || trip.status === 'in_progress'
  const canStart = trip.status === 'scheduled'
  const canFinish = trip.status === 'in_progress'

  function closeConfirmation() {
    if (isPending) return
    setConfirmation(undefined)
    setError(undefined)
  }

  function confirm() {
    if (!confirmation) return
    const selectedAction = confirmation
    setError(undefined)
    startTransition(async () => {
      const result = selectedAction === 'cancel'
        ? await cancelTripAction(trip.id)
        : selectedAction === 'start'
          ? await startTripAction(trip.id)
          : await finishTripAction(trip.id)
      if (result.status === 'error') {
        setError(result.message)
        showToast({ tone: 'error', title: t('operationBlocked'), description: result.message })
        return
      }
      setConfirmation(undefined)
      router.refresh()
      showToast({
        tone: 'success',
        title: selectedAction === 'start' ? t('startedTitle') : selectedAction === 'finish' ? t('completedTitle') : t('canceledTitle'),
        description: selectedAction === 'start'
          ? t('startedDescription')
          : selectedAction === 'finish'
            ? t('completedDescription')
            : t('canceledDescription'),
      })
    })
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Button onClick={() => setEditing(true)} disabled={!canEdit} title={!canEdit ? t('cannotEdit') : undefined}>
          <Icon name="edit" className="text-[18px]" /> {t('edit')}
        </Button>
        {canStart && (
          <Button variant="primary" onClick={() => setConfirmation('start')}>
            <Icon name="play_arrow" className="text-[18px]" /> {t('startTrip')}
          </Button>
        )}
        {canCancel && (
          <Button variant="danger" onClick={() => setConfirmation('cancel')}>
            <Icon name="cancel" className="text-[18px]" /> {t('cancelTrip')}
          </Button>
        )}
        {canFinish && (
          <Button variant="primary" onClick={() => setConfirmation('finish')}>
            <Icon name="check_circle" className="text-[18px]" /> {t('finishTrip')}
          </Button>
        )}
      </div>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title={t('editTitle')}
        description={t('editDescription', { id: trip.id })}
        className="max-w-3xl"
      >
        <TripForm
          trip={trip}
          stages={stages}
          vehicles={vehicles}
          drivers={drivers}
          onCancel={() => setEditing(false)}
          onSuccess={() => {
            setEditing(false)
            router.refresh()
            showToast({ tone: 'success', title: t('updatedTitle'), description: t('updatedDescription', { id: trip.id }) })
          }}
        />
      </Modal>

      <Modal
        open={confirmation !== undefined}
        onClose={closeConfirmation}
        title={confirmation === 'start' ? t('confirm.startTitle') : confirmation === 'finish' ? t('confirm.finishTitle') : t('confirm.cancelTitle')}
        description={confirmation === 'start'
          ? t('confirm.startDescription', { id: trip.id })
          : confirmation === 'finish'
            ? t('confirm.finishDescription', { id: trip.id })
            : t('confirm.cancelDescription', { id: trip.id })}
      >
        <div className="space-y-4">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {confirmation === 'start'
              ? t('confirm.startBody')
              : confirmation === 'finish'
                ? t('confirm.finishBody', { distance: formatDecimal(trip.distanceKm, locale) })
                : t('confirm.cancelBody')}
          </p>
          {error && (
            <p role="alert" className="rounded-xs bg-error-container px-3 py-2 font-body-sm text-body-sm text-on-error-container">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button onClick={closeConfirmation} disabled={isPending}>{t('confirm.back')}</Button>
            <Button variant={confirmation === 'cancel' ? 'danger' : 'primary'} onClick={confirm} disabled={isPending}>
              <Icon name={confirmation === 'start' ? 'play_arrow' : confirmation === 'finish' ? 'check_circle' : 'cancel'} className="text-[18px]" />
              {isPending
                ? t('confirm.processing')
                : confirmation === 'start'
                  ? t('confirm.confirmStart')
                  : confirmation === 'finish'
                    ? t('confirm.confirmFinish')
                    : t('confirm.confirmCancellation')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
