import 'server-only'

import { redirect } from 'next/navigation'
import { UnauthorizedError } from './api-error'

export function redirectToExpiredSession(currentPath: string): never {
  redirect(`/api/auth/expirar?from=${encodeURIComponent(currentPath)}`)
}

export async function withSession<T>(currentPath: string, read: () => Promise<T>): Promise<T> {
  try {
    return await read()
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirectToExpiredSession(currentPath)
    }
    throw error
  }
}

export async function withOptionalSession<T>(
  currentPath: string,
  read: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await read()
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirectToExpiredSession(currentPath)
    }
    return fallback
  }
}
