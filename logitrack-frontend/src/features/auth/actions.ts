'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ApiRequestError } from '@/shared/api/api-error'
import { SESSION_COOKIE } from '@/shared/config/session'
import { login } from './api/auth-api'
import { sanitizeInternalPath } from './lib/internal-path'

export type LoginFormState = {
  /** Mensagem de erro para exibir; ausente quando nao houve tentativa ou deu certo. */
  error?: string
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

  let token: string
  let expiresAt: string
  try {
    const user = await login(email, senha)
    token = user.token
    expiresAt = user.expiresAt
  } catch (error) {
    if (error instanceof ApiRequestError) {
      // 401 do backend vem como "E-mail ou senha invalidos."
      return { error: error.status === 401 ? t('invalidCredentials') : error.message }
    }
    // Rede fora, API caida: nao vazar stack para a tela.
    return { error: t('network') }
  }

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // Vem do proprio token (`expiraEm`, um OffsetDateTime — a unica data da API
    // que e instante de verdade). Amarrar o cookie a vida do token faz os dois
    // morrerem juntos, em vez de sobrar cookie apontando para token expirado.
    expires: new Date(expiresAt),
  })

  // `redirect` lanca uma excecao de controle do Next; fica fora do try/catch
  // acima de proposito, senao seria capturada como erro de login.
  redirect(from)
}

export async function signOutAction(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect('/login')
}
