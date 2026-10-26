// The rules every item must follow, in one place so the importer, the add
// dialog and the detail panel all agree. Pure functions, no dependencies.

// "Above 1900 and below 2100". Change these two numbers to move the limits.
export const MIN_YEAR = 1901
export const MAX_YEAR = 2099

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

export const isValidYear = (year: unknown): year is number =>
  typeof year === 'number' && Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR

export function parseYear(text: string): Parsed<number> {
  const value = text.trim()
  if (!value) return { ok: false, error: 'Year is required.' }
  if (!/^\d{4}$/.test(value)) return { ok: false, error: 'Use four digits, like 1999.' }
  if (!isValidYear(Number(value))) {
    return { ok: false, error: `Year must be between ${MIN_YEAR} and ${MAX_YEAR}.` }
  }
  return { ok: true, value: Number(value) }
}

export function parsePositiveInt(text: string): Parsed<number> {
  const value = text.trim()
  if (!/^\d{1,4}$/.test(value) || Number(value) < 1) {
    return { ok: false, error: 'Use a whole number, 1 or more.' }
  }
  return { ok: true, value: Number(value) }
}

// Reads a date typed by hand and returns it as yyyy-mm-dd.
// Accepts d/m/yy, dd/mm/yyyy (with / . - or spaces) and yyyy-mm-dd.
// A two-digit year always means 20xx ("26" is 2026), whatever today's date is.
// Dates before 2000 need all four digits, and a date in the future is refused,
// so a typo like "95" can never silently become some other year.
export function parseDate(text: string, today: Date = new Date()): Parsed<string> {
  const value = text.trim()
  if (!value) return { ok: false, error: 'Enter a date, like 02/10/26.' }

  let day: number, month: number, year: number
  let twoDigitYear = false
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value)
  const dmy = /^(\d{1,2})[/.\- ](\d{1,2})[/.\- ](\d{2}|\d{4})$/.exec(value)
  if (iso) {
    ;[year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])]
  } else if (dmy) {
    ;[day, month] = [Number(dmy[1]), Number(dmy[2])]
    year = Number(dmy[3])
    if (dmy[3].length === 2) {
      year += 2000
      twoDigitYear = true
    }
  } else {
    return { ok: false, error: 'Use day/month/year, like 02/10/26.' }
  }

  if (!isValidYear(year)) {
    return { ok: false, error: `The year must be between ${MIN_YEAR} and ${MAX_YEAR}.` }
  }
  const check = new Date(Date.UTC(year, month - 1, day))
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return { ok: false, error: 'That day does not exist in the calendar.' }
  }
  const pad = (n: number): string => String(n).padStart(2, '0')
  const result = `${year}-${pad(month)}-${pad(day)}`
  const todayISO = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  if (result > todayISO) {
    return {
      ok: false,
      error: twoDigitYear
        ? 'That date is in the future. For a year before 2000, type all four digits.'
        : 'That date is in the future.'
    }
  }
  return { ok: true, value: result }
}

// A season number for a series' progress, within the number of seasons when that is known.
export function parseSeasonNumber(text: string, seasons?: number): Parsed<number> {
  const result = parsePositiveInt(text)
  if (result.ok && seasons !== undefined && result.value > seasons) {
    return { ok: false, error: `This series has ${seasons} ${seasons === 1 ? 'season' : 'seasons'}.` }
  }
  return result
}

// What is wrong with an item, in plain words. Empty means it is fine.
export function itemProblems(
  item: {
    year?: number
    yearEnd?: number
    dates: string[]
    seasons?: number
    progress?: { season: number; episode: number }
  },
  today: Date = new Date()
): string[] {
  const problems: string[] = []
  if (item.year === undefined) problems.push('Year is missing.')
  else if (!isValidYear(item.year)) problems.push(`Year must be between ${MIN_YEAR} and ${MAX_YEAR}.`)
  if (item.yearEnd !== undefined) {
    if (!isValidYear(item.yearEnd) || (isValidYear(item.year) && item.yearEnd < item.year)) {
      problems.push('End year is invalid or before the start year.')
    }
  }
  if (item.progress) {
    const { season, episode } = item.progress
    if (!Number.isInteger(season) || season < 1 || !Number.isInteger(episode) || episode < 1) {
      problems.push('Progress needs a season and an episode of 1 or more.')
    } else if (item.seasons !== undefined && season > item.seasons) {
      problems.push(`Progress is at season ${season} but the series has ${item.seasons}.`)
    }
  }
  for (const date of item.dates) {
    const parsed = parseDate(date, today)
    if (!parsed.ok || parsed.value !== date) problems.push(`The date ${date} is invalid or in the future.`)
  }
  return problems
}
