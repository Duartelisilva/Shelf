// The "Year in review" and "Month" pages: what you saw or read in one year or one
// month. Pure functions, covered by tests.
//
// What counts: every dated watch or read of a finished item is one "entry". An
// item seen twice in a period has two entries but counts once in the totals, and
// ratings are the item's own rating. Items without dates cannot be placed in a
// period. Movies, series and books are summarised separately, as everywhere.

import type { MediaItem, MediaType } from '../../../shared/types'
import { MEDIA_TYPES } from './vocab'

export interface Entry {
  item: MediaItem
  date: string // yyyy-mm-dd
}

export interface YearMonth {
  year: number
  month: number // 1 to 12
}

export interface TypeSummary {
  count: number
  averageRating: number | null
  ratedCount: number
  best: MediaItem | null // the highest rated, if any is rated
}

export interface YearReview {
  year: number
  total: number // different items
  watches: number // all entries, counting rewatches
  averageRating: number | null
  byType: Record<MediaType, TypeSummary>
  perMonth: { month: number; movie: number; series: number; book: number; total: number }[]
  busiestMonth: { month: number; count: number } | null
  first: Entry | null
  last: Entry | null
  topRated: Record<MediaType, MediaItem[]>
  genres: Record<MediaType, { name: string; count: number }[]>
  franchises: Record<MediaType, { name: string; items: number; watches: number }[]>
  mostRewatched: { item: MediaItem; times: number }[]
}

export interface MonthReview {
  year: number
  month: number
  total: number
  watches: number
  averageRating: number | null
  byType: Record<MediaType, TypeSummary>
  entries: Entry[] // oldest first
  days: Record<number, Entry[]> // by day of the month
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]
export const monthName = (month: number): string => MONTH_NAMES[month - 1]

const pad = (n: number): string => String(n).padStart(2, '0')
const monthOf = (date: string): number => Number(date.slice(5, 7))
const yearOf = (date: string): number => Number(date.slice(0, 4))

// Every dated watch or read of a finished item, oldest first.
export function entriesOf(items: MediaItem[]): Entry[] {
  const entries: Entry[] = []
  for (const item of items) {
    if (item.status !== 'finished') continue
    for (const date of item.dates) entries.push({ item, date })
  }
  return entries.sort(
    (a, b) => a.date.localeCompare(b.date) || a.item.title.localeCompare(b.item.title)
  )
}

// The first month there is anything to show, or this month when nothing is dated.
function firstMonth(items: MediaItem[], today: Date): YearMonth {
  const first = entriesOf(items)[0]?.date
  const here = { year: today.getFullYear(), month: today.getMonth() + 1 }
  if (!first) return here
  const found = { year: yearOf(first), month: monthOf(first) }
  return found.year * 12 + found.month > here.year * 12 + here.month ? here : found
}

// Years that can be chosen: from the year of your first recorded watch or read up
// to the current year, newest first. A year before your first one is never offered.
export function availableYears(items: MediaItem[], today: Date): number[] {
  const years: number[] = []
  for (let y = today.getFullYear(); y >= firstMonth(items, today).year; y--) years.push(y)
  return years
}

// Months of a year that can be chosen, oldest first, never before your first
// recorded watch or read and never after the current month.
export function availableMonths(items: MediaItem[], year: number, today: Date): number[] {
  const first = firstMonth(items, today)
  const start = year === first.year ? first.month : 1
  const end = year === today.getFullYear() ? today.getMonth() + 1 : 12
  if (year < first.year || year > today.getFullYear()) return []
  const months: number[] = []
  for (let m = start; m <= end; m++) months.push(m)
  return months
}

// Every month that can be chosen, oldest first (for the previous and next buttons).
export function allMonths(items: MediaItem[], today: Date): YearMonth[] {
  return availableYears(items, today)
    .reverse()
    .flatMap((year) => availableMonths(items, year, today).map((month) => ({ year, month })))
}

const average = (values: number[]): number | null =>
  values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null

const byRatingThenTitle = (a: MediaItem, b: MediaItem): number =>
  (b.rating ?? 0) - (a.rating ?? 0) || a.title.localeCompare(b.title)

function summarise(items: MediaItem[]): TypeSummary {
  const rated = items.filter((i) => i.rating !== undefined)
  return {
    count: items.length,
    averageRating: average(rated.map((i) => i.rating ?? 0)),
    ratedCount: rated.length,
    best: [...rated].sort(byRatingThenTitle)[0] ?? null
  }
}

// The different items behind a list of entries, with how many entries each has.
function distinctItems(entries: Entry[]): { item: MediaItem; times: number }[] {
  const found = new Map<string, { item: MediaItem; times: number }>()
  for (const { item } of entries) {
    const known = found.get(item.id)
    if (known) known.times += 1
    else found.set(item.id, { item, times: 1 })
  }
  return [...found.values()]
}

function summariseByType(distinct: { item: MediaItem }[]): Record<MediaType, TypeSummary> {
  const of = (type: MediaType): MediaItem[] =>
    distinct.filter((d) => d.item.type === type).map((d) => d.item)
  return {
    movie: summarise(of('movie')),
    series: summarise(of('series')),
    book: summarise(of('book'))
  }
}

export function yearReview(items: MediaItem[], year: number): YearReview {
  const entries = entriesOf(items).filter((e) => yearOf(e.date) === year)
  const distinct = distinctItems(entries)
  const itemsOf = (type: MediaType): { item: MediaItem; times: number }[] =>
    distinct.filter((d) => d.item.type === type)

  const perMonth = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    const inMonth = distinctItems(entries.filter((e) => monthOf(e.date) === month))
    const count = (type: MediaType): number => inMonth.filter((d) => d.item.type === type).length
    return {
      month,
      movie: count('movie'),
      series: count('series'),
      book: count('book'),
      total: inMonth.length
    }
  })
  const busiest = perMonth.reduce((best, m) => (m.total > best.total ? m : best), perMonth[0])

  const genres = {} as YearReview['genres']
  const franchises = {} as YearReview['franchises']
  const topRated = {} as YearReview['topRated']
  for (const type of MEDIA_TYPES) {
    const mine = itemsOf(type)
    const genreCounts = new Map<string, number>()
    for (const { item } of mine)
      for (const g of item.genres) genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1)
    genres[type] = [...genreCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 6)

    const groups = new Map<string, { items: number; watches: number }>()
    for (const { item, times } of mine) {
      if (!item.franchise) continue
      const group = groups.get(item.franchise) ?? { items: 0, watches: 0 }
      group.items += 1
      group.watches += times
      groups.set(item.franchise, group)
    }
    franchises[type] = [...groups.entries()]
      .map(([name, g]) => ({ name, ...g }))
      .filter((g) => g.items >= 2)
      .sort((a, b) => b.watches - a.watches || b.items - a.items || a.name.localeCompare(b.name))
      .slice(0, 5)

    topRated[type] = mine
      .map((d) => d.item)
      .filter((i) => i.rating !== undefined)
      .sort(byRatingThenTitle)
      .slice(0, 5)
  }

  return {
    year,
    total: distinct.length,
    watches: entries.length,
    averageRating: average(
      distinct.filter((d) => d.item.rating !== undefined).map((d) => d.item.rating ?? 0)
    ),
    byType: summariseByType(distinct),
    perMonth,
    busiestMonth: busiest.total > 0 ? { month: busiest.month, count: busiest.total } : null,
    first: entries[0] ?? null,
    last: entries[entries.length - 1] ?? null,
    topRated,
    genres,
    franchises,
    mostRewatched: distinct
      .filter((d) => d.times >= 2)
      .sort((a, b) => b.times - a.times || a.item.title.localeCompare(b.item.title))
      .slice(0, 5)
  }
}

export function monthReview(items: MediaItem[], year: number, month: number): MonthReview {
  const prefix = `${year}-${pad(month)}-`
  const entries = entriesOf(items).filter((e) => e.date.startsWith(prefix))
  const distinct = distinctItems(entries)
  const days: Record<number, Entry[]> = {}
  for (const entry of entries) (days[Number(entry.date.slice(8, 10))] ??= []).push(entry)
  return {
    year,
    month,
    total: distinct.length,
    watches: entries.length,
    averageRating: average(
      distinct.filter((d) => d.item.rating !== undefined).map((d) => d.item.rating ?? 0)
    ),
    byType: summariseByType(distinct),
    entries,
    days
  }
}

// The weeks of a month for a calendar, Monday first. Days outside the month are null.
export function calendarWeeks(year: number, month: number): (number | null)[][] {
  const lead = (new Date(year, month - 1, 1).getDay() + 6) % 7
  const days = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1)
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7))
}
