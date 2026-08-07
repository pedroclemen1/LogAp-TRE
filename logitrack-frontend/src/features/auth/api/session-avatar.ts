import 'server-only'

import { cookies } from 'next/headers'
import { SESSION_COOKIE } from '@/shared/config/session'
import { avatarInitialFromEmail } from '../lib/avatar-initial'

function jwtSubject(token: string | undefined): string | undefined {
  const parts = token?.split('.')
  if (parts?.length !== 3) return undefined

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { sub?: unknown }
    return typeof payload.sub === 'string' ? payload.sub : undefined
  } catch {
    return undefined
  }
}

export async function getSessionAvatarInitial(): Promise<string> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  return avatarInitialFromEmail(jwtSubject(token))
}
