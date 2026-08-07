'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ApiRequestError, UnauthorizedError } from '@/shared/api/api-error'
import { redirectToExpiredSession } from '@/shared/api/require-session'
import {
  cancelTrip,
  completeTripStage,
  createTrip,
  deleteTrip,
  deleteTrips,
  fetchTripDetails,
  finishTrip,
  startTrip,
  updateTrip,
} from './api/trips-api'
import type { TripInputDto, TripStageInputDto } from './api/trip-dto'
import type { TripDetailsLoadState } from './model/trip'
import type { TripFormField, TripFormState, TripMutationState } from './model/trip-form'

type ParsedTripForm = {
  values: Record<TripFormField, string>
  input?: TripInputDto
  fieldErrors?: Record<string, string>
}

const MAX_STAGES = 30

type ValidationMessages = {
  selectVehicle: string
  invalidDriver: string
  requiredDeparture: string
  requiredOrigin: string
  stagesCount: string
  invalidStage: string
  destination: string
  distance: string
  load: string
  routeOrder: string
}

function parseTripForm(formData: FormData, messages: ValidationMessages): ParsedTripForm {
  const values: Record<TripFormField, string> = {
    veiculoId: String(formData.get('veiculoId') ?? ''),
    motoristaId: String(formData.get('motoristaId') ?? ''),
    dataSaida: String(formData.get('dataSaida') ?? '').trim(),
    origem: String(formData.get('origem') ?? '').trim(),
  }
  const vehicleId = Number(values.veiculoId)
  const driverId = values.motoristaId ? Number(values.motoristaId) : undefined
  const stageCount = Number(formData.get('trechosQuantidade'))
  const fieldErrors: Record<string, string> = {}

  if (!Number.isInteger(vehicleId) || vehicleId <= 0) fieldErrors.veiculoId = messages.selectVehicle
  if (driverId !== undefined && (!Number.isInteger(driverId) || driverId <= 0)) {
    fieldErrors.motoristaId = messages.invalidDriver
  }
  if (!values.dataSaida) fieldErrors.dataSaida = messages.requiredDeparture
  if (!values.origem) fieldErrors.origem = messages.requiredOrigin
  if (!Number.isInteger(stageCount) || stageCount < 1 || stageCount > MAX_STAGES) {
    fieldErrors.trechos = messages.stagesCount
  }

  const stages: TripStageInputDto[] = []
  let previousExpected = values.dataSaida
  if (Number.isInteger(stageCount) && stageCount >= 1 && stageCount <= MAX_STAGES) {
    for (let index = 0; index < stageCount; index += 1) {
      const prefix = `trechos[${index}]`
      const rawId = String(formData.get(`${prefix}.id`) ?? '')
      const destination = String(formData.get(`${prefix}.destino`) ?? '').trim()
      const rawDistance = String(formData.get(`${prefix}.kmTrecho`) ?? '').trim()
      const rawLoad = String(formData.get(`${prefix}.cargaKg`) ?? '').trim()
      const expectedAt = String(formData.get(`${prefix}.previstoEm`) ?? '').trim()
      const id = rawId ? Number(rawId) : undefined
      const distance = rawDistance ? Number(rawDistance) : Number.NaN
      const load = rawLoad ? Number(rawLoad) : Number.NaN

      if (id !== undefined && (!Number.isInteger(id) || id <= 0)) {
        fieldErrors[`${prefix}.id`] = messages.invalidStage
      }
      if (!destination) fieldErrors[`${prefix}.destino`] = messages.destination
      if (!Number.isFinite(distance) || distance <= 0) {
        fieldErrors[`${prefix}.kmTrecho`] = messages.distance
      }
      if (!Number.isFinite(load) || load < 0) {
        fieldErrors[`${prefix}.cargaKg`] = messages.load
      }
      if (expectedAt && previousExpected && expectedAt < previousExpected) {
        fieldErrors[`${prefix}.previstoEm`] = messages.routeOrder
      }
      if (expectedAt) previousExpected = expectedAt

      stages.push({
        id,
        destino: destination,
        kmTrecho: distance,
        cargaKg: load,
        previstoEm: expectedAt || undefined,
      })
    }
  }

  if (Object.keys(fieldErrors).length > 0) return { values, fieldErrors }
  return {
    values,
    input: {
      veiculoId: vehicleId,
      motoristaId: driverId,
      dataSaida: values.dataSaida,
      origem: values.origem,
      trechos: stages,
    },
  }
}

function errorState(error: unknown, values: Record<TripFormField, string>, networkMessage: string): TripFormState {
  if (error instanceof ApiRequestError) {
    return {
      status: 'error',
      message: error.status === 400 ? undefined : error.message,
      fieldErrors: error.fieldErrors,
      values,
    }
  }
  return { status: 'error', message: networkMessage, values }
}

async function parseLocalizedTripForm(formData: FormData) {
  const t = await getTranslations('Trips.validation')
  return {
    parsed: parseTripForm(formData, {
      selectVehicle: t('selectVehicle'),
      invalidDriver: t('invalidDriver'),
      requiredDeparture: t('requiredDeparture'),
      requiredOrigin: t('requiredOrigin'),
      stagesCount: t('stagesCount', { max: MAX_STAGES }),
      invalidStage: t('invalidStage'),
      destination: t('destination'),
      distance: t('distance'),
      load: t('load'),
      routeOrder: t('routeOrder'),
    }),
    t,
  }
}

function refreshTripViews(id?: number) {
  revalidatePath('/viagens')
  if (id) revalidatePath(`/viagens/${id}`)
  revalidatePath('/frota')
  revalidatePath('/')
}

export async function createTripAction(
  _previousState: TripFormState,
  formData: FormData,
): Promise<TripFormState> {
  const { parsed, t } = await parseLocalizedTripForm(formData)
  if (!parsed.input) return { status: 'error', fieldErrors: parsed.fieldErrors, values: parsed.values }

  let createdId: number | undefined
  try {
    createdId = (await createTrip(parsed.input)).id
  } catch (error) {
    if (error instanceof UnauthorizedError) redirectToExpiredSession('/viagens/nova')
    else return errorState(error, parsed.values, t('network'))
  }

  if (createdId === undefined) return { status: 'error', message: t('createdMissing') }

  refreshTripViews(createdId)
  redirect(`/viagens/${createdId}?created=1`)
}

export async function updateTripAction(
  id: number,
  _previousState: TripFormState,
  formData: FormData,
): Promise<TripFormState> {
  const { parsed, t } = await parseLocalizedTripForm(formData)
  if (!parsed.input) return { status: 'error', fieldErrors: parsed.fieldErrors, values: parsed.values }

  try {
    await updateTrip(id, parsed.input)
  } catch (error) {
    if (error instanceof UnauthorizedError) redirectToExpiredSession(`/viagens/${id}`)
    else return errorState(error, parsed.values, t('network'))
  }

  refreshTripViews(id)
  return { status: 'success' }
}

export async function loadTripDetailsAction(id: number): Promise<TripDetailsLoadState> {
  const t = await getTranslations('Trips.validation')
  try {
    return { status: 'success', details: await fetchTripDetails(id) }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirectToExpiredSession('/viagens')
    else if (error instanceof ApiRequestError) return { status: 'error', message: error.message }
    else return { status: 'error', message: t('loadFailed') }
  }
}

export async function deleteTripsAction(ids: number[]): Promise<TripMutationState> {
  return mutateTrips(async () => {
    if (ids.length === 1) await deleteTrip(ids[0])
    else await deleteTrips(ids)
  })
}

export async function finishTripAction(id: number): Promise<TripMutationState> {
  return mutateTrips(() => finishTrip(id), id)
}

export async function startTripAction(id: number): Promise<TripMutationState> {
  return mutateTrips(() => startTrip(id), id)
}

export async function cancelTripAction(id: number): Promise<TripMutationState> {
  return mutateTrips(() => cancelTrip(id), id)
}

/**
 * Registra a chegada em UM trecho, sem encerrar a viagem.
 *
 * Quem decide se a viagem termina e o backend: concluir o ultimo trecho e, por
 * definicao, ter chegado ao destino. O front nao replica essa regra.
 */
export async function completeTripStageAction(
  tripId: number,
  stageId: number,
): Promise<TripMutationState> {
  return mutateTrips(() => completeTripStage(tripId, stageId), tripId)
}

async function mutateTrips(operation: () => Promise<void>, id?: number): Promise<TripMutationState> {
  const t = await getTranslations('Trips.validation')
  try {
    await operation()
  } catch (error) {
    if (error instanceof UnauthorizedError) redirectToExpiredSession(id ? `/viagens/${id}` : '/viagens')
    else if (error instanceof ApiRequestError) return { status: 'error', message: error.message }
    else return { status: 'error', message: t('network') }
  }

  refreshTripViews(id)
  return { status: 'success' }
}
