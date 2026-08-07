'use client'

import { useActionState, useEffect, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { createTripAction, updateTripAction } from '../actions'
import { useEventCallback } from '@/shared/hooks/use-event-callback'
import { useToast } from '@/shared/ui/use-toast'
import type { Trip } from '../model/trip'
import type { TripFormField, TripFormState } from '../model/trip-form'

type TripFormAction = (previousState: TripFormState, formData: FormData) => Promise<TripFormState>

function inputDateTime(value: string | undefined): string {
  return value?.slice(0, 16) ?? ''
}

function initialState(trip?: Trip): TripFormState {
  if (!trip) return { status: 'idle' }
  return {
    status: 'idle',
    values: {
      veiculoId: String(trip.vehicleId),
      motoristaId: trip.driverId === undefined ? '' : String(trip.driverId),
      dataSaida: inputDateTime(trip.departureAt),
      origem: trip.origin,
    },
  }
}

export function useTripFormController(trip: Trip | undefined, onSuccess?: () => void) {
  const t = useTranslations('Trips.form')
  const { showToast } = useToast()
  const action = useMemo<TripFormAction>(
    () => (trip ? updateTripAction.bind(null, trip.id) : createTripAction),
    [trip],
  )
  const initial = useMemo(() => initialState(trip), [trip])
  const [state, formAction, isSubmitting] = useActionState<TripFormState, FormData>(action, initial)
  const emitSuccess = useEventCallback(onSuccess)
  const handledState = useRef<TripFormState>(undefined)

  /*
   * Duas protecoes contra o efeito redisparar sozinho:
   *
   * 1. `emitSuccess` tem identidade estavel (ver useEventCallback). Sem isso, o
   *    `onSuccess` inline do chamador mudava a cada render e reentrava aqui.
   * 2. A ref marca qual objeto de estado ja foi tratado. `useActionState`
   *    devolve um objeto NOVO por submissao, entao comparar por identidade faz
   *    o efeito rodar uma vez por submissao — e nao a cada re-render enquanto
   *    o status continua 'success'.
   *
   * Sem as duas, atualizar uma viagem entrava em laco: onSuccess ->
   * router.refresh() -> render -> efeito -> onSuccess -> ... inundando a API
   * com GET /viagens e GET /viagens/{id}.
   */
  useEffect(() => {
    if (handledState.current === state) return
    handledState.current = state

    if (state.status === 'success') emitSuccess()
    if (state.status === 'error' && state.message) {
      showToast({ tone: 'error', title: t('saveFailed'), description: state.message })
    }
  }, [state, emitSuccess, showToast, t])

  return {
    formAction,
    isSubmitting,
    errorMessage: state.message,
    fieldError: (field: string) => state.fieldErrors?.[field],
    submittedValue: (field: TripFormField) => state.values?.[field] ?? '',
  }
}
