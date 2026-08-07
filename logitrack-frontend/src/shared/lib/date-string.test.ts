import { describe, expect, it } from 'vitest'
import { diffInDays, parseLocalDate, splitLocalDateTime } from './date-string'

describe('local date helpers', () => {
  it('splits a LocalDateTime without applying a timezone', () => {
    expect(splitLocalDateTime('2026-08-10T05:21:46.874687')).toEqual({ date: '2026-08-10', time: '05:21' })
  })

  it('parses a LocalDate into numeric parts', () => {
    expect(parseLocalDate('2024-05-20')).toEqual({ year: 2024, month: 5, day: 20 })
  })

  it('calculates whole calendar days across months and leap years', () => {
    expect(diffInDays('2024-02-28', '2024-03-01')).toBe(2)
    expect(diffInDays('2026-08-10', '2026-08-08')).toBe(-2)
  })
})
