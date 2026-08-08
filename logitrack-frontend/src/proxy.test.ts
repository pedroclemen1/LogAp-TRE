import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from './proxy'
import { PASSWORD_CHANGE_REQUIRED_COOKIE, SESSION_COOKIE } from './shared/config/session'

function request(path: string, cookies: Record<string, string> = {}) {
  const cookie = Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join('; ')
  return new NextRequest(`https://app.example.com${path}`, {
    headers: cookie ? { cookie } : undefined,
  })
}

describe('authentication navigation proxy', () => {
  it('preserves the requested internal path when redirecting to login', () => {
    const response = proxy(request('/viagens?pagina=2'))

    expect(response.headers.get('location')).toBe(
      'https://app.example.com/login?from=%2Fviagens%3Fpagina%3D2',
    )
  })

  it('keeps invitation activation public', () => {
    const response = proxy(request('/convite?token=one-time-token'))

    expect(response.headers.get('location')).toBeNull()
  })

  it('sends an authenticated user with an initial password to password change', () => {
    const response = proxy(request('/login', {
      [SESSION_COOKIE]: 'jwt',
      [PASSWORD_CHANGE_REQUIRED_COOKIE]: '1',
    }))

    expect(response.headers.get('location')).toBe('https://app.example.com/alterar-senha')
  })

  it('blocks application pages until the required password change is completed', () => {
    const response = proxy(request('/frota', {
      [SESSION_COOKIE]: 'jwt',
      [PASSWORD_CHANGE_REQUIRED_COOKIE]: '1',
    }))

    expect(response.headers.get('location')).toBe('https://app.example.com/alterar-senha')
  })

  it('allows the password change page with an authenticated session', () => {
    const response = proxy(request('/alterar-senha', {
      [SESSION_COOKIE]: 'jwt',
      [PASSWORD_CHANGE_REQUIRED_COOKIE]: '1',
    }))

    expect(response.headers.get('location')).toBeNull()
  })
})
