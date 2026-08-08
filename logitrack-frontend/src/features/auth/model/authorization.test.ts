import { describe, expect, it } from 'vitest'
import { canManageMasterData } from './authorization'

describe('canManageMasterData', () => {
  it('permite a interface de gestao para o gestor', () => {
    expect(canManageMasterData('GESTOR')).toBe(true)
  })

  it.each([['OPERADOR'], [undefined], ['ADMIN']])(
    'mantem a interface somente leitura para %s',
    (role) => {
      expect(canManageMasterData(role)).toBe(false)
    },
  )
})
