'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { ApiRequestError, UnauthorizedError } from '@/shared/api/api-error'
import { redirectToExpiredSession } from '@/shared/api/require-session'
import {
  createDriver,
  deactivateDriver,
  reactivateDriver,
  updateDriver,
} from './api/drivers-api'
import {
  createMaintenanceService,
  deactivateMaintenanceService,
  reactivateMaintenanceService,
  updateMaintenanceService,
} from './api/maintenance-services-api'
import type {
  DriverInput,
  MaintenanceServiceInput,
  ReferenceMutationState,
} from './model/reference-data'

async function mutate(
  operation: () => Promise<void>,
  path: '/motoristas' | '/servicos-manutencao',
): Promise<ReferenceMutationState> {
  const t = await getTranslations('Reference.common')
  try {
    await operation()
  } catch (error) {
    if (error instanceof UnauthorizedError) redirectToExpiredSession(path)
    else if (error instanceof ApiRequestError) {
      return { status: 'error', message: error.status === 400 ? undefined : error.message, fieldErrors: error.fieldErrors }
    } else return { status: 'error', message: t('networkError') }
  }

  revalidatePath(path)
  if (path === '/motoristas') revalidatePath('/viagens')
  return { status: 'success' }
}

function normalizeDriver(input: DriverInput): DriverInput {
  return {
    nome: input.nome.trim(),
    cnh: input.cnh.replace(/\D/g, ''),
    telefone: input.telefone?.trim() || undefined,
  }
}

export async function saveDriverAction(id: number | undefined, input: DriverInput): Promise<ReferenceMutationState> {
  const normalized = normalizeDriver(input)
  return mutate(() => id ? updateDriver(id, normalized) : createDriver(normalized), '/motoristas')
}

export async function deactivateDriverAction(id: number): Promise<ReferenceMutationState> {
  return mutate(() => deactivateDriver(id), '/motoristas')
}

export async function reactivateDriverAction(id: number): Promise<ReferenceMutationState> {
  return mutate(() => reactivateDriver(id), '/motoristas')
}

export async function saveMaintenanceServiceAction(
  id: number | undefined,
  input: MaintenanceServiceInput,
): Promise<ReferenceMutationState> {
  const normalized = { nome: input.nome.trim() }
  return mutate(
    () => id ? updateMaintenanceService(id, normalized) : createMaintenanceService(normalized),
    '/servicos-manutencao',
  )
}

export async function deactivateMaintenanceServiceAction(id: number): Promise<ReferenceMutationState> {
  return mutate(() => deactivateMaintenanceService(id), '/servicos-manutencao')
}

export async function reactivateMaintenanceServiceAction(id: number): Promise<ReferenceMutationState> {
  return mutate(() => reactivateMaintenanceService(id), '/servicos-manutencao')
}
