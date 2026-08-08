import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UnauthorizedError } from '@/shared/api/api-error'

const mocks = vi.hoisted(() => ({
  changePassword: vi.fn(),
  login: vi.fn(),
  redirect: vi.fn((_path: string): never => {
    throw new Error('NEXT_REDIRECT')
  }),
  redirectToExpiredSession: vi.fn((_path: string): never => {
    throw new Error('SESSION_REDIRECT')
  }),
  writeAuthenticatedSession: vi.fn(),
  clearAuthenticatedSession: vi.fn(),
  getSignedLoginClientIdentity: vi.fn(async () => 'signed-client-identity'),
}))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async (namespace: string) => (key: string) => `${namespace}.${key}`),
}))
vi.mock('@/shared/api/require-session', () => ({
  redirectToExpiredSession: mocks.redirectToExpiredSession,
}))
vi.mock('./api/auth-api', () => ({
  changePassword: mocks.changePassword,
  login: mocks.login,
}))
vi.mock('./api/login-client-identity', () => ({
  getSignedLoginClientIdentity: mocks.getSignedLoginClientIdentity,
}))
vi.mock('./api/session-cookies', () => ({
  clearAuthenticatedSession: mocks.clearAuthenticatedSession,
  writeAuthenticatedSession: mocks.writeAuthenticatedSession,
}))

import { changePasswordAction } from './actions'

function validPasswordChangeForm(): FormData {
  const formData = new FormData()
  formData.set('currentPassword', 'current-password')
  formData.set('newPassword', 'new-password-123')
  formData.set('confirmation', 'new-password-123')
  return formData
}

describe('changePasswordAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses the central expired-session flow when the API returns 401', async () => {
    mocks.changePassword.mockRejectedValueOnce(new UnauthorizedError())

    await expect(changePasswordAction({}, validPasswordChangeForm()))
      .rejects.toThrow('SESSION_REDIRECT')

    expect(mocks.redirectToExpiredSession).toHaveBeenCalledWith('/alterar-senha')
    expect(mocks.writeAuthenticatedSession).not.toHaveBeenCalled()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})
