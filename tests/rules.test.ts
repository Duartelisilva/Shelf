import { describe, expect, it } from 'vitest'
import { itemProblems, parseDate, parsePositiveInt, parseSeasonNumber, parseYear } from '../src/shared/rules'

const today = new Date(2026, 9, 24) // 24 October 2026

describe('parseYear', () => {
  it('accepts years above 1900 and below 2100', () => {
    expect(parseYear('1999')).toEqual({ ok: true, value: 1999 })
    expect(parseYear(' 2099 ')).toEqual({ ok: true, value: 2099 })
    expect(parseYear('1901')).toEqual({ ok: true, value: 1901 })
  })
  it('rejects empty, short, long and out-of-range years', () => {
    for (const bad of ['', '99', '19999', '1900', '2100', 'abcd', '19.5']) {
      expect(parseYear(bad).ok).toBe(false)
    }
  })
})

describe('parseDate', () => {
  it('reads short dates as 20xx and shows them with four digits', () => {
    expect(parseDate('2/10/26', today)).toEqual({ ok: true, value: '2026-10-02' })
    expect(parseDate('02/10/2026', today)).toEqual({ ok: true, value: '2026-10-02' })
    expect(parseDate('2.10.26', today)).toEqual({ ok: true, value: '2026-10-02' })
    expect(parseDate('2-10-26', today)).toEqual({ ok: true, value: '2026-10-02' })
    expect(parseDate('2026-10-02', today)).toEqual({ ok: true, value: '2026-10-02' })
  })
  it('always reads a two-digit year as 20xx, whatever the current year is', () => {
    expect(parseDate('2/10/26', new Date(2027, 0, 1))).toEqual({ ok: true, value: '2026-10-02' })
    expect(parseDate('2/10/26', new Date(2040, 5, 1))).toEqual({ ok: true, value: '2026-10-02' })
  })
  it('refuses a short year that would be in the future, and asks for four digits', () => {
    const result = parseDate('1/1/95', today)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('four digits')
    expect(parseDate('1/1/1995', today)).toEqual({ ok: true, value: '1995-01-01' })
  })
  it('refuses dates after today but accepts today', () => {
    expect(parseDate('24/10/2026', today).ok).toBe(true)
    expect(parseDate('25/10/2026', today).ok).toBe(false)
    expect(parseDate('2/10/27', today).ok).toBe(false)
  })
  it('rejects dates that do not exist or are out of range', () => {
    for (const bad of ['', '31/02/26', '32/01/26', '1/13/26', 'tomorrow', '1/1/1850', '1/1/2150']) {
      expect(parseDate(bad, today).ok).toBe(false)
    }
    expect(parseDate('29/02/24', today).ok).toBe(true) // leap year
    expect(parseDate('29/02/25', today).ok).toBe(false)
  })
})

describe('parsePositiveInt', () => {
  it('accepts whole numbers from 1', () => {
    expect(parsePositiveInt('3')).toEqual({ ok: true, value: 3 })
    for (const bad of ['0', '-1', '1.5', 'x', '']) expect(parsePositiveInt(bad).ok).toBe(false)
  })
})

describe('itemProblems', () => {
  it('finds nothing wrong with a valid item', () => {
    expect(itemProblems({ year: 2008, dates: ['2024-03-14'] }, today)).toEqual([])
  })
  it('reports a missing or invalid year, end year and dates', () => {
    expect(itemProblems({ dates: [] })).toEqual(['Year is missing.'])
    expect(itemProblems({ year: 1850, dates: [] })).toHaveLength(1)
    expect(itemProblems({ year: 2010, yearEnd: 2005, dates: [] })).toHaveLength(1)
    expect(itemProblems({ year: 2010, dates: ['2024-02-31'] }, today)).toHaveLength(1)
    expect(itemProblems({ year: 2010, dates: ['2027-01-01'] }, today)).toHaveLength(1)
  })
})

describe('series progress', () => {
  it('accepts a season within the number of seasons, when that is known', () => {
    expect(parseSeasonNumber('2', 3)).toEqual({ ok: true, value: 2 })
    expect(parseSeasonNumber('4', 3).ok).toBe(false)
    expect(parseSeasonNumber('4').ok).toBe(true)
    expect(parseSeasonNumber('0', 3).ok).toBe(false)
  })

  it('flags progress that is invalid or beyond the number of seasons', () => {
    const base = { year: 2020, dates: [] as string[] }
    expect(itemProblems({ ...base, seasons: 3, progress: { season: 2, episode: 5 } }, today)).toEqual([])
    expect(itemProblems({ ...base, progress: { season: 9, episode: 1 } }, today)).toEqual([])
    expect(itemProblems({ ...base, seasons: 3, progress: { season: 4, episode: 1 } }, today)).toHaveLength(1)
    expect(itemProblems({ ...base, progress: { season: 0, episode: 1 } }, today)).toHaveLength(1)
    expect(itemProblems({ ...base, progress: { season: 1, episode: 1.5 } }, today)).toHaveLength(1)
  })
})
