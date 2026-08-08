import 'server-only'

import { cookies } from 'next/headers'
import { SESSION_COOKIE } from '@/shared/config/session'
import type { UserRole } from './auth-api'

type JwtClaims = {
  sub?: unknown
  nome?: unknown
  perfil?: unknown
}

export type SessionUser = {
  email: string
  name?: string
  role?: UserRole
}

function readClaims(token: string | undefined): JwtClaims | undefined {
  const parts = token?.split('.')
  if (parts?.length !== 3) return undefined

  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as JwtClaims
  } catch {
    return undefined
  }
}

export async function getSessionUser(): Promise<SessionUser | undefined> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const claims = readClaims(token)
  if (typeof claims?.sub !== 'string') return undefined

  const role = claims.perfil === 'GESTOR' || claims.perfil === 'OPERADOR' ? claims.perfil : undefined
  return {
    email: claims.sub,
    name: typeof claims.nome === 'string' ? claims.nome : undefined,
    role,
  }
}
