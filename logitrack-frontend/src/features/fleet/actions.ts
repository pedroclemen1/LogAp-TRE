'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { ApiRequestError, UnauthorizedError } from '@/shared/api/api-error'
import { redirectToExpiredSession } from '@/shared/api/require-session'
import { createVehicle, deleteVehicle, deleteVehicles, updateVehicle } from './api/fleet-api'
import type { FleetDeleteState, VehicleFormField, VehicleFormState } from './model/vehicle-form'

// Este modulo exporta APENAS funcoes async — restricao do `'use server'`.
// Constantes, parsers e tipos permanecem privados ou vivem em model/.

type VehicleInput = {
  placa: string
  modelo: string
  tipo: 'LEVE' | 'PESADO'
  ano: number
  kmInicial: number
}

type ParsedForm = {
  values: Record<VehicleFormField, string>
  input?: VehicleInput
  fieldErrors?: Partial<Record<VehicleFormField, string>>
}

function parseVehicleForm(formData: FormData, messages: {
  invalidYear: string
  invalidMileage: string
  invalidCategory: string
}): ParsedForm {
  const values: Record<VehicleFormField, string> = {
    placa: String(formData.get('placa') ?? '').trim().toUpperCase(),
    modelo: String(formData.get('modelo') ?? '').trim(),
    tipo: String(formData.get('tipo') ?? ''),
    ano: String(formData.get('ano') ?? '').trim(),
    kmInicial: String(formData.get('kmInicial') ?? '').trim(),
  }

  // Validacao de FORMATO so: regras de dominio continuam no backend.
  const ano = Number(values.ano)
  const kmInicial = values.kmInicial === '' ? Number.NaN : Number(values.kmInicial)
  const fieldErrors: Partial<Record<VehicleFormField, string>> = {}

  if (!Number.isFinite(ano)) fieldErrors.ano = messages.invalidYear
  if (!Number.isFinite(kmInicial)) {
    fieldErrors.kmInicial = messages.invalidMileage
  }
  if (values.tipo !== 'LEVE' && values.tipo !== 'PESADO') {
    fieldErrors.tipo = messages.invalidCategory
  }

  if (Object.keys(fieldErrors).length > 0) return { values, fieldErrors }

  return {
    values,
    input: {
      placa: values.placa,
      modelo: values.modelo,
      tipo: values.tipo as 'LEVE' | 'PESADO',
      ano,
      kmInicial,
    },
  }
}

async function saveVehicle(
  operation: (input: VehicleInput) => Promise<void>,
  formData: FormData,
): Promise<VehicleFormState> {
  const t = await getTranslations('Fleet.validation')
  const parsed = parseVehicleForm(formData, {
    invalidYear: t('invalidYear'),
    invalidMileage: t('invalidMileage'),
    invalidCategory: t('invalidCategory'),
  })
  if (!parsed.input) return { status: 'error', fieldErrors: parsed.fieldErrors, values: parsed.values }

  try {
    await operation(parsed.input)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirectToExpiredSession('/frota')
    } else if (error instanceof ApiRequestError) {
      return {
        status: 'error',
        message: error.status === 400 ? undefined : error.message,
        fieldErrors: error.fieldErrors,
        values: parsed.values,
      }
    } else {
      return {
        status: 'error',
        message: t('network'),
        values: parsed.values,
      }
    }
  }

  revalidatePath('/frota')
  return { status: 'success' }
}

export async function createVehicleAction(
  _previousState: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  return saveVehicle(createVehicle, formData)
}

export async function updateVehicleAction(
  id: number,
  _previousState: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  return saveVehicle((input) => updateVehicle(id, input), formData)
}

export async function deleteVehiclesAction(ids: number[]): Promise<FleetDeleteState> {
  const t = await getTranslations('Fleet.validation')
  try {
    if (ids.length === 1) await deleteVehicle(ids[0])
    else await deleteVehicles(ids)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirectToExpiredSession('/frota')
    } else if (error instanceof ApiRequestError) {
      return { status: 'error', message: error.message }
    } else {
      return { status: 'error', message: t('network') }
    }
  }

  revalidatePath('/frota')
  return { status: 'success' }
}
