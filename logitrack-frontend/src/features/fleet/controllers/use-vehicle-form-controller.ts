'use client'

import { useActionState, useEffect, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { createVehicleAction, updateVehicleAction } from '../actions'
import { useEventCallback } from '@/shared/hooks/use-event-callback'
import { useToast } from '@/shared/ui/use-toast'
import type { FleetVehicle } from '../model/vehicle'
import type { VehicleFormField, VehicleFormState } from '../model/vehicle-form'

type VehicleFormAction = (
  previousState: VehicleFormState,
  formData: FormData,
) => Promise<VehicleFormState>

function initialState(vehicle?: FleetVehicle): VehicleFormState {
  if (!vehicle) return { status: 'idle' }

  return {
    status: 'idle',
    values: {
      placa: vehicle.plate,
      modelo: vehicle.model,
      tipo: vehicle.category === 'heavy' ? 'PESADO' : 'LEVE',
      ano: vehicle.year === undefined ? '' : String(vehicle.year),
      kmInicial: String(vehicle.initialKm),
    },
  }
}

/** Compartilha validacao/estado entre cadastro e edicao sem duplicar o formulario. */
export function useVehicleFormController(vehicle: FleetVehicle | undefined, onSuccess: () => void) {
  const t = useTranslations('Fleet.toasts')
  const { showToast } = useToast()
  const action = useMemo<VehicleFormAction>(
    () => (vehicle ? updateVehicleAction.bind(null, vehicle.id) : createVehicleAction),
    [vehicle],
  )
  const initial = useMemo(() => initialState(vehicle), [vehicle])
  const [state, formAction, isSubmitting] = useActionState<VehicleFormState, FormData>(action, initial)
  const emitSuccess = useEventCallback(onSuccess)
  const handledState = useRef<VehicleFormState>(undefined)

  // Mesmo padrao do controller de viagem: identidade estavel para o callback e
  // uma marca do estado ja tratado. Ver `use-event-callback` para o laco que
  // isso evita.
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
    fieldError: (field: VehicleFormField) => state.fieldErrors?.[field],
    submittedValue: (field: VehicleFormField) => state.values?.[field] ?? '',
  }
}
