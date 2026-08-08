import 'server-only'

import { createHmac, randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { getBffSharedSecret } from '@/shared/config/env'
import { LOGIN_CLIENT_COOKIE } from '@/shared/config/session'

const CLIENT_ID_PATTERN = /^[A-Za-z0-9_-]{43}$/
const CLIENT_ID_BYTES = 32
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export async function getSignedLoginClientIdentity(): Promise<string> {
  const cookieStore = await cookies()
  const current = cookieStore.get(LOGIN_CLIENT_COOKIE)?.value
  const clientId = current && CLIENT_ID_PATTERN.test(current)
    ? current
    : randomBytes(CLIENT_ID_BYTES).toString('base64url')

  if (clientId !== current) {
    cookieStore.set(LOGIN_CLIENT_COOKIE, clientId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: COOKIE_MAX_AGE_SECONDS,
    })
  }

  const signature = createHmac('sha256', getBffSharedSecret())
    .update(clientId, 'ascii')
    .digest('base64url')
  return `${clientId}.${signature}`
}
