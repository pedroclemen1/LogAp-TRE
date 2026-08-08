import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError, UnauthorizedError } from '@/shared/api/api-error'

const mocks = vi.hoisted(() => ({
  acceptInvitation: vi.fn(),
  createInvitation: vi.fn(),
  clearAuthenticatedSession: vi.fn(),
  redirect: vi.fn((_path: string): never => {
    throw new Error('NEXT_REDIRECT')
  }),
  redirectToExpiredSession: vi.fn((_path: string): never => {
    throw new Error('SESSION_REDIRECT')
  }),
}))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async (namespace: string) => (key: string) => `${namespace}.${key}`),
}))
vi.mock('@/shared/api/require-session', () => ({
  redirectToExpiredSession: mocks.redirectToExpiredSession,
}))
vi.mock('./api/invitation-api', () => ({
  acceptInvitation: mocks.acceptInvitation,
  createInvitation: mocks.createInvitation,
}))
vi.mock('./api/session-cookies', () => ({
  clearAuthenticatedSession: mocks.clearAuthenticatedSession,
}))

import { acceptInvitationAction, createInvitationAction } from './invitation-actions'

function acceptanceForm(): FormData {
  const formData = new FormData()
  formData.set('token', 'one-time-token')
  formData.set('name', 'Test User')
  formData.set('password', 'valid-password-123')
  formData.set('confirmation', 'valid-password-123')
  return formData
}

function creationForm(): FormData {
  const formData = new FormData()
  formData.set('email', 'new.user@example.com')
  formData.set('role', 'OPERADOR')
  return formData
}

describe('invitation actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.acceptInvitation.mockResolvedValue(undefined)
    mocks.clearAuthenticatedSession.mockResolvedValue(undefined)
  })

  it('clears an old session before redirecting after invitation acceptance', async () => {
    await expect(acceptInvitationAction({}, acceptanceForm())).rejects.toThrow('NEXT_REDIRECT')

    expect(mocks.clearAuthenticatedSession).toHaveBeenCalledOnce()
    expect(mocks.redirect).toHaveBeenCalledWith('/login?convite=aceito')
    expect(mocks.clearAuthenticatedSession.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.redirect.mock.invocationCallOrder[0])
  })

  it('localizes the password policy error returned while accepting an invitation', async () => {
    mocks.acceptInvitation.mockRejectedValueOnce(
      new ApiRequestError(422, 'backend fallback', undefined, 'WEAK_PASSWORD'),
    )

    await expect(acceptInvitationAction({}, acceptanceForm())).resolves.toEqual({
      error: 'Invitation.errors.weakPassword',
    })

    expect(mocks.clearAuthenticatedSession).not.toHaveBeenCalled()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('uses the central expired-session flow when invitation creation returns 401', async () => {
    mocks.createInvitation.mockRejectedValueOnce(new UnauthorizedError())

    await expect(createInvitationAction({}, creationForm())).rejects.toThrow('SESSION_REDIRECT')

    expect(mocks.redirectToExpiredSession).toHaveBeenCalledWith('/usuarios')
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})
