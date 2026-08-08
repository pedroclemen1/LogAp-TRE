'use server'

import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ApiRequestError, UnauthorizedError } from '@/shared/api/api-error'
import { redirectToExpiredSession } from '@/shared/api/require-session'
import { changePassword, login } from './api/auth-api'
import { getSignedLoginClientIdentity } from './api/login-client-identity'
import { clearAuthenticatedSession, writeAuthenticatedSession } from './api/session-cookies'
import { sanitizeInternalPath } from './lib/internal-path'

export type LoginFormState = {
  /** Mensagem de erro para exibir; ausente quando nao houve tentativa ou deu certo. */
  error?: string
}

export type PasswordChangeFormState = {
  error?: string
  fieldErrors?: Partial<Record<'currentPassword' | 'newPassword' | 'confirmation', string>>
}

/**
 * Grava o JWT num cookie httpOnly.
 *
 * Precisa ser Server Action ou Route Handler: `document.cookie` no navegador
 * NAO consegue setar httpOnly, e Server Component nao pode escrever cookie
 * (o header ja foi enviado quando o render comeca).
 */
export async function signInAction(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const t = await getTranslations('Auth.errors')
  const email = String(formData.get('email') ?? '').trim()
  const senha = String(formData.get('senha') ?? '')
  const from = sanitizeInternalPath(String(formData.get('from') ?? ''))

  if (!email || !senha) {
    return { error: t('required') }
  }

  let user: Awaited<ReturnType<typeof login>>
  try {
    user = await login(email, senha, await getSignedLoginClientIdentity())
  } catch (error) {
    if (error instanceof ApiRequestError) {
      // 401 do backend vem como "E-mail ou senha invalidos."
      return { error: error.status === 401 ? t('invalidCredentials') : error.message }
    }
    // Rede fora, API caida: nao vazar stack para a tela.
    return { error: t('network') }
  }

  await writeAuthenticatedSession(user)

  // `redirect` lanca uma excecao de controle do Next; fica fora do try/catch
  // acima de proposito, senao seria capturada como erro de login.
  redirect(user.passwordChangeRequired ? '/alterar-senha' : from)
}

export async function changePasswordAction(
  _previousState: PasswordChangeFormState,
  formData: FormData,
): Promise<PasswordChangeFormState> {
  const t = await getTranslations('PasswordChange')
  const currentPassword = String(formData.get('currentPassword') ?? '')
  const newPassword = String(formData.get('newPassword') ?? '')
  const confirmation = String(formData.get('confirmation') ?? '')
  const fieldErrors: PasswordChangeFormState['fieldErrors'] = {}

  if (!currentPassword) fieldErrors.currentPassword = t('validation.currentRequired')
  if (!newPassword) fieldErrors.newPassword = t('validation.newRequired')
  if (!confirmation) fieldErrors.confirmation = t('validation.confirmationRequired')
  else if (newPassword !== confirmation) fieldErrors.confirmation = t('validation.passwordMismatch')

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors }

  let user: Awaited<ReturnType<typeof changePassword>>
  try {
    user = await changePassword(currentPassword, newPassword)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirectToExpiredSession('/alterar-senha')
    }
    if (error instanceof ApiRequestError) {
      if (error.code === 'INVALID_CURRENT_PASSWORD') return { error: t('errors.invalidCurrent') }
      if (error.code === 'WEAK_PASSWORD') return { error: t('errors.weakPassword') }
      if (error.code === 'PASSWORD_REUSE') return { error: t('errors.passwordReuse') }
      return { error: error.message }
    }
    return { error: t('errors.network') }
  }

  await writeAuthenticatedSession(user)
  redirect('/')
}

export async function signOutAction(): Promise<void> {
  await clearAuthenticatedSession()
  redirect('/login')
}
