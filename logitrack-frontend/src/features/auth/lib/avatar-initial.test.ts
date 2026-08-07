import { describe, expect, it } from 'vitest'
import { avatarInitialFromEmail } from './avatar-initial'

describe('avatarInitialFromEmail', () => {
  it.each([
    ['pedro@empresa.com', 'P'],
    ['testador@empresa.com', 'T'],
    ['  maria@empresa.com  ', 'M'],
  ])('uses the uppercase initial from %s', (email, initial) => {
    expect(avatarInitialFromEmail(email)).toBe(initial)
  })

  it.each([undefined, '', 'email-invalido', '@empresa.com'])('falls back for %s', (email) => {
    expect(avatarInitialFromEmail(email)).toBe('?')
  })
})
