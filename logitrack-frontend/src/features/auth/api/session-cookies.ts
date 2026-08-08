import 'server-only'

import { cookies } from 'next/headers'
import { PASSWORD_CHANGE_REQUIRED_COOKIE, SESSION_COOKIE } from '@/shared/config/session'

type AuthenticatedSession = {
  token: string
  expiresAt: string
  passwordChangeRequired: boolean
}

export async function writeAuthenticatedSession(session: AuthenticatedSession): Promise<void> {
  const cookieStore = await cookies()
  const expires = new Date(session.expiresAt)

  cookieStore.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  })

  if (session.passwordChangeRequired) {
    cookieStore.set(PASSWORD_CHANGE_REQUIRED_COOKIE, '1', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires,
    })
  } else {
    cookieStore.delete(PASSWORD_CHANGE_REQUIRED_COOKIE)
  }
}

export async function clearAuthenticatedSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  cookieStore.delete(PASSWORD_CHANGE_REQUIRED_COOKIE)
}
