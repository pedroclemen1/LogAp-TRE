import { describe, expect, it } from 'vitest'
import { sanitizeInternalPath } from './internal-path'

describe('sanitizeInternalPath', () => {
  it('keeps internal paths and their query string', () => {
    expect(sanitizeInternalPath('/viagens?page=2')).toBe('/viagens?page=2')
  })

  it.each([
    undefined,
    null,
    '',
    'viagens',
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
  ])('falls back to the home page for %s', (value) => {
    expect(sanitizeInternalPath(value)).toBe('/')
  })
})
