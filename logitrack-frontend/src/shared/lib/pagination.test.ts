import { describe, expect, it } from 'vitest'
import { paginationWindow } from './pagination'

describe('paginationWindow', () => {
  it('returns no pages for an empty result', () => {
    expect(paginationWindow(0, 0)).toEqual([])
  })

  it('keeps the first pages visible near the beginning', () => {
    expect(paginationWindow(0, 10)).toEqual([0, 1, 2, 3, 4])
  })

  it('centers the current page in the middle', () => {
    expect(paginationWindow(5, 10)).toEqual([3, 4, 5, 6, 7])
  })

  it('keeps the last pages visible near the end', () => {
    expect(paginationWindow(9, 10)).toEqual([5, 6, 7, 8, 9])
  })

  it('returns every page when the result is smaller than the window', () => {
    expect(paginationWindow(1, 3)).toEqual([0, 1, 2])
  })
})
