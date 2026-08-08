'use server'

import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ApiRequestError, UnauthorizedError } from '@/shared/api/api-error'
import { redirectToExpiredSession } from '@/shared/api/require-session'
import { acceptInvitation, createInvitation, type CreatedInvitation } from './api/invitation-api'
import type { UserRole } from './api/auth-api'
import { clearAuthenticatedSession } from './api/session-cookies'

export type AcceptInvitationFormState = {
  error?: string
  fieldErrors?: Partial<Record<'name' | 'password' | 'confirmation', string>>
}

export type CreateInvitationFormState = {
  error?: string
  fieldErrors?: Partial<Record<'email' | 'role', string>>
  invitation?: CreatedInvitation
}

function invitationError(code: string | undefined, fallback: string, t: Awaited<ReturnType<typeof getTranslations>>) {
  switch (code) {
    case 'INVITATION_INVALID_OR_EXPIRED':
      return t('errors.invalid')
    case 'WEAK_PASSWORD':
      return t('errors.weakPassword')
    case 'EMAIL_ALREADY_REGISTERED':
      return t('errors.emailAlreadyRegistered')
    case 'ACCESS_DENIED':
      return t('errors.accessDenied')
    default:
      return fallback
  }
}

export async function acceptInvitationAction(
  _previousState: AcceptInvitationFormState,
  formData: FormData,
): Promise<AcceptInvitationFormState> {
  const t = await getTranslations('Invitation')
  const token = String(formData.get('token') ?? '').trim()
  const name = String(formData.get('name') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const confirmation = String(formData.get('confirmation') ?? '')
  const fieldErrors: AcceptInvitationFormState['fieldErrors'] = {}

  if (!name) fieldErrors.name = t('validation.nameRequired')
  if (!password) fieldErrors.password = t('validation.passwordRequired')
  else if (password.length < 12) fieldErrors.password = t('validation.passwordLength')
  if (!confirmation) fieldErrors.confirmation = t('validation.confirmationRequired')
  else if (password !== confirmation) fieldErrors.confirmation = t('validation.passwordMismatch')

  if (!token) return { error: t('errors.invalid') }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors }

  try {
    await acceptInvitation(token, name, password)
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return { error: invitationError(error.code, error.message, t) }
    }
    return { error: t('errors.network') }
  }

  await clearAuthenticatedSession()
  redirect('/login?convite=aceito')
}

export async function createInvitationAction(
  _previousState: CreateInvitationFormState,
  formData: FormData,
): Promise<CreateInvitationFormState> {
  const t = await getTranslations('Invitation')
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const role = String(formData.get('role') ?? '') as UserRole
  const fieldErrors: CreateInvitationFormState['fieldErrors'] = {}

  if (!email) fieldErrors.email = t('validation.emailRequired')
  if (role !== 'OPERADOR' && role !== 'GESTOR') fieldErrors.role = t('validation.roleRequired')
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors }

  try {
    return { invitation: await createInvitation(email, role) }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirectToExpiredSession('/usuarios')
    }
    if (error instanceof ApiRequestError) {
      return { error: invitationError(error.code, error.message, t) }
    }
    return { error: t('errors.network') }
  }
}
