'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { ApiRequestError, UnauthorizedError } from '@/shared/api/api-error'
import { redirectToExpiredSession } from '@/shared/api/require-session'
import { isWithinDateWindow } from '@/shared/lib/date-window'
import {
  createMaintenance,
  deleteMaintenance,
  fetchMaintenance,
  finishMaintenance,
  startMaintenance,
  updateMaintenance,
} from './api/maintenance-api'
import type { MaintenanceFormState } from './model/maintenance-form'
import type { MaintenanceInput, MaintenanceLoadState, MaintenanceMutationState } from './model/maintenance'

type ParsedMaintenance = {
  input?: MaintenanceInput
  fieldErrors?: Record<string, string>
}

type ValidationMessages = {
  selectVehicle: string
  requiredStart: string
  requiredFinish: string
  invalidRange: string
  dateOutOfRange: string
  servicesCount: string
  selectService: (number: number) => string
  duplicateService: (number: number) => string
  invalidCost: (number: number) => string
}

function parseMaintenanceForm(formData: FormData, messages: ValidationMessages): ParsedMaintenance {
  const vehicleId = Number(formData.get('veiculoId'))
  const plannedStart = String(formData.get('dataInicioPrevista') ?? '').trim()
  const plannedFinish = String(formData.get('dataFinalizacaoPrevista') ?? '').trim()
  const count = Number(formData.get('servicosQuantidade'))
  const fieldErrors: Record<string, string> = {}

  if (!Number.isInteger(vehicleId) || vehicleId <= 0) fieldErrors.veiculoId = messages.selectVehicle
  if (!plannedStart) fieldErrors.dataInicioPrevista = messages.requiredStart
  else if (!isWithinDateWindow(plannedStart)) fieldErrors.dataInicioPrevista = messages.dateOutOfRange

  if (!plannedFinish) fieldErrors.dataFinalizacaoPrevista = messages.requiredFinish
  // Limite absoluto antes da regra relativa: inicio e fim ambos em 9999
  // satisfazem "fim depois do inicio".
  else if (!isWithinDateWindow(plannedFinish)) fieldErrors.dataFinalizacaoPrevista = messages.dateOutOfRange
  else if (plannedStart && plannedFinish < plannedStart) {
    fieldErrors.dataFinalizacaoPrevista = messages.invalidRange
  }
  if (!Number.isInteger(count) || count < 1 || count > 30) {
    fieldErrors.servicos = messages.servicesCount
  }

  const services: MaintenanceInput['servicos'] = []
  const selected = new Set<number>()
  if (Number.isInteger(count) && count >= 1 && count <= 30) {
    for (let index = 0; index < count; index += 1) {
      const prefix = `servicos[${index}]`
      const rawId = String(formData.get(`${prefix}.id`) ?? '')
      const serviceId = Number(formData.get(`${prefix}.servicoId`))
      const rawCost = String(formData.get(`${prefix}.custo`) ?? '').trim().replace(',', '.')
      const cost = rawCost === '' ? Number.NaN : Number(rawCost)
      const id = rawId ? Number(rawId) : undefined

      if (!Number.isInteger(serviceId) || serviceId <= 0) {
        fieldErrors[`${prefix}.servicoId`] = messages.selectService(index + 1)
      } else if (!selected.add(serviceId)) {
        fieldErrors[`${prefix}.servicoId`] = messages.duplicateService(index + 1)
      }
      if (!Number.isFinite(cost) || cost < 0) {
        fieldErrors[`${prefix}.custo`] = messages.invalidCost(index + 1)
      }
      services.push({ id, servicoId: serviceId, custo: cost })
    }
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors }
  return {
    input: {
      veiculoId: vehicleId,
      dataInicioPrevista: plannedStart,
      dataFinalizacaoPrevista: plannedFinish,
      servicos: services,
    },
  }
}

function requestError(error: unknown, networkMessage: string): MaintenanceFormState {
  if (error instanceof ApiRequestError) {
    return {
      status: 'error',
      message: error.status === 400 ? undefined : error.message,
      fieldErrors: error.fieldErrors,
    }
  }
  return { status: 'error', message: networkMessage }
}

function refreshMaintenanceViews() {
  revalidatePath('/manutencoes')
  revalidatePath('/frota')
  revalidatePath('/viagens')
  revalidatePath('/')
}

async function save(
  operation: (input: MaintenanceInput) => Promise<void>,
  formData: FormData,
): Promise<MaintenanceFormState> {
  const t = await getTranslations('Maintenance.validation')
  const parsed = parseMaintenanceForm(formData, {
    selectVehicle: t('selectVehicle'),
    requiredStart: t('requiredStart'),
    requiredFinish: t('requiredFinish'),
    invalidRange: t('invalidRange'),
    dateOutOfRange: t('dateOutOfRange'),
    servicesCount: t('servicesCount'),
    selectService: (number) => t('selectService', { number }),
    duplicateService: (number) => t('duplicateService', { number }),
    invalidCost: (number) => t('invalidCost', { number }),
  })
  if (!parsed.input) return { status: 'error', fieldErrors: parsed.fieldErrors }

  try {
    await operation(parsed.input)
  } catch (error) {
    if (error instanceof UnauthorizedError) redirectToExpiredSession('/manutencoes')
    else return requestError(error, t('network'))
  }

  refreshMaintenanceViews()
  return { status: 'success' }
}

export async function createMaintenanceAction(
  _previous: MaintenanceFormState,
  formData: FormData,
): Promise<MaintenanceFormState> {
  return save(createMaintenance, formData)
}

export async function updateMaintenanceAction(
  id: number,
  _previous: MaintenanceFormState,
  formData: FormData,
): Promise<MaintenanceFormState> {
  return save((input) => updateMaintenance(id, input), formData)
}

export async function loadMaintenanceAction(id: number): Promise<MaintenanceLoadState> {
  const t = await getTranslations('Maintenance.validation')
  try {
    return { status: 'success', maintenance: await fetchMaintenance(id) }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirectToExpiredSession('/manutencoes')
    else if (error instanceof ApiRequestError) return { status: 'error', message: error.message }
    else return { status: 'error', message: t('loadFailed') }
  }
}

async function mutate(operation: () => Promise<void>): Promise<MaintenanceMutationState> {
  const t = await getTranslations('Maintenance.validation')
  try {
    await operation()
  } catch (error) {
    if (error instanceof UnauthorizedError) redirectToExpiredSession('/manutencoes')
    else if (error instanceof ApiRequestError) return { status: 'error', message: error.message }
    else return { status: 'error', message: t('network') }
  }
  refreshMaintenanceViews()
  return { status: 'success' }
}

export async function startMaintenanceAction(id: number): Promise<MaintenanceMutationState> {
  return mutate(() => startMaintenance(id))
}

export async function finishMaintenanceAction(id: number): Promise<MaintenanceMutationState> {
  return mutate(() => finishMaintenance(id))
}

export async function deleteMaintenanceAction(id: number): Promise<MaintenanceMutationState> {
  return mutate(() => deleteMaintenance(id))
}
