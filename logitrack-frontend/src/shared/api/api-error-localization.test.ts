import { describe, expect, it } from 'vitest'
import { resolveApiError, resolveApiErrorCode } from './api-error-localization'

describe('API error code localization', () => {
  it('maps the login rate limit without depending on the backend message', () => {
    expect(resolveApiErrorCode('LOGIN_RATE_LIMIT_EXCEEDED')).toEqual({ key: 'loginRateLimit' })
  })

  it('maps generic request failures by stable backend code', () => {
    expect(resolveApiErrorCode('MALFORMED_REQUEST')).toEqual({ key: 'malformedRequest' })
    expect(resolveApiErrorCode('INVALID_PARAMETER')).toEqual({ key: 'invalidParameter' })
    expect(resolveApiErrorCode('DATA_CONFLICT')).toEqual({ key: 'dataConflict' })
  })

  it('keeps unknown codes available for fallback handling', () => {
    expect(resolveApiErrorCode('UNKNOWN_CODE')).toBeUndefined()
  })

  it('localizes the vehicle history rule after reports were removed', () => {
    expect(resolveApiError('Nao e possivel excluir veiculo com viagens ou manutencoes: ABC-1234.'))
      .toEqual({ key: 'vehicleHasHistory', values: { plates: 'ABC-1234' } })
  })
})
