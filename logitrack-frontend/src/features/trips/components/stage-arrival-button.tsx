'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'
import { Modal } from '@/shared/ui/modal'
import { useToast } from '@/shared/ui/use-toast'
import { completeTripStageAction } from '../actions'

/**
 * Registra a chegada no proximo trecho pendente da rota.
 *
 * `'use client'` fica AQUI, na folha, e nao na timeline inteira: so este botao
 * precisa de interacao. A `TripRouteTimeline` continua sendo Server Component.
 *
 * O componente nao decide se a viagem termina — quem sabe disso e o backend
 * (concluir o ultimo trecho encerra a viagem). Aqui so se pergunta se este e o
 * ultimo para escolher o texto da confirmacao.
 */
export function StageArrivalButton({
  tripId,
  stageId,
  city,
  isFinalDestination,
}: {
  tripId: number
  stageId: number
  city: string
  isFinalDestination: boolean
}) {
  const t = useTranslations('Trips.stageArrival')
  const router = useRouter()
  const { showToast } = useToast()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string>()
  const [isPending, startTransition] = useTransition()

  function close() {
    if (isPending) return
    setConfirming(false)
    setError(undefined)
  }

  function confirm() {
    setError(undefined)
    startTransition(async () => {
      const result = await completeTripStageAction(tripId, stageId)
      if (result.status === 'error') {
        setError(result.message)
        showToast({ tone: 'error', title: t('blockedTitle'), description: result.message })
        return
      }
      setConfirming(false)
      router.refresh()
      showToast({
        tone: 'success',
        title: isFinalDestination ? t('tripCompletedTitle') : t('arrivedTitle'),
        description: isFinalDestination
          ? t('tripCompletedDescription', { city })
          : t('arrivedDescription', { city }),
      })
    })
  }

  return (
    <>
      <Button
        variant="primary"
        onClick={() => setConfirming(true)}
        className="mt-2 !px-2 !py-1 text-[11px]"
      >
        <Icon name={isFinalDestination ? 'flag' : 'where_to_vote'} className="text-[14px]" />
        {isFinalDestination ? t('finishHere') : t('registerArrival')}
      </Button>

      <Modal
        open={confirming}
        onClose={close}
        title={isFinalDestination ? t('confirmFinalTitle') : t('confirmTitle')}
        description={t('confirmDescription', { city })}
      >
        <div className="space-y-4">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {isFinalDestination ? t('confirmFinalBody', { city }) : t('confirmBody', { city })}
          </p>
          {error && (
            <p role="alert" className="rounded-xs bg-error-container px-3 py-2 font-body-sm text-body-sm text-on-error-container">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button onClick={close} disabled={isPending}>{t('back')}</Button>
            <Button variant="primary" onClick={confirm} disabled={isPending}>
              <Icon name={isFinalDestination ? 'flag' : 'where_to_vote'} className="text-[18px]" />
              {isPending ? t('processing') : t('confirmAction')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
