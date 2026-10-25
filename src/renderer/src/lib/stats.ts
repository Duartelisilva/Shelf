// Everything the Stats page shows, computed from the library. Pure functions,
// no React, covered by tests.
//
// What counts: only finished items (seen or read). An item with several dates
// counts once in the totals, and once in each year it was seen. Items with no
// date count in all-time numbers but cannot appear in any year.

import type { MediaItem, MediaType } from '../../../shared/types'

export type Period = 'all' | number

export interface Stats {
  counts: Record<MediaType, number>
  thisYear: Record<MediaType, number> // finished items with a date in the current year
  wishlist: number
  averageRating: number | null
  ratedCount: number
  topRated: Record<MediaType, MediaItem[]>
  mostRewatched: MediaItem[]
  perYear: { year: number; count: number }[]
  undated: number
  franchises: { name: string; items: number; watches: number }[]
  genres: { name: string; count: number }[]
  years: number[] // years that have at least one date, newest first (for the selector)
}

const TYPES: MediaType[] = ['movie', 'series', 'book']
const yearOf = (iso: string): number => Number(iso.slice(0, 4))
const yearsOf = (item: MediaItem): number[] => [...new Set(item.dates.map(yearOf))]
const perType = (items: MediaItem[]): Record<MediaType, number> => ({
  movie: items.filter((i) => i.type === 'movie').length,
  series: items.filter((i) => i.type === 'series').length,
  book: items.filter((i) => i.type === 'book').length
})

export function computeStats(items: MediaItem[], period: Period, currentYear: number): Stats {
  const finished = items.filter((i) => i.status === 'finished')
  const inPeriod = period === 'all' ? finished : finished.filter((i) => yearsOf(i).includes(period))

  const rated = inPeriod.filter((i) => i.rating !== undefined)
  const averageRating = rated.length
    ? Math.round((rated.reduce((sum, i) => sum + (i.rating ?? 0), 0) / rated.length) * 10) / 10
    : null

  const byRating = (type: MediaType): MediaItem[] =>
    rated
      .filter((i) => i.type === type)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.title.localeCompare(b.title))
      .slice(0, 5)
  const topRated = { movie: byRating('movie'), series: byRating('series'), book: byRating('book') }

  const datesIn = (item: MediaItem): number =>
    period === 'all' ? item.dates.length : item.dates.filter((d) => yearOf(d) === period).length
  const mostRewatched = inPeriod
    .filter((i) => datesIn(i) >= 2)
    .sort((a, b) => datesIn(b) - datesIn(a) || a.title.localeCompare(b.title))
    .slice(0, 5)

  // Items per year always shows the whole history, so the chart works as context.
  const yearCounts = new Map<number, number>()
  for (const item of finished) for (const y of yearsOf(item)) yearCounts.set(y, (yearCounts.get(y) ?? 0) + 1)
  const years = [...yearCounts.keys()].sort((a, b) => b - a)
  const perYear: Stats['perYear'] = []
  if (years.length > 0) {
    const first = Math.max(years[years.length - 1], years[0] - 9) // at most the last 10 years
    for (let y = first; y <= years[0]; y++) perYear.push({ year: y, count: yearCounts.get(y) ?? 0 })
  }

  const groups = new Map<string, { items: number; watches: number }>()
  for (const item of inPeriod) {
    if (!item.franchise) continue
    const group = groups.get(item.franchise) ?? { items: 0, watches: 0 }
    group.items += 1
    group.watches += Math.max(1, datesIn(item))
    groups.set(item.franchise, group)
  }
  const franchises = [...groups.entries()]
    .map(([name, g]) => ({ name, ...g }))
    .filter((g) => g.items >= 2)
    .sort((a, b) => b.watches - a.watches || b.items - a.items || a.name.localeCompare(b.name))
    .slice(0, 5)

  const genreCounts = new Map<string, number>()
  for (const item of inPeriod) for (const g of item.genres) genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1)
  const genres = [...genreCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 8)

  return {
    counts: perType(inPeriod),
    thisYear: perType(finished.filter((i) => yearsOf(i).includes(currentYear))),
    wishlist: items.filter((i) => i.status === 'wishlist').length,
    averageRating,
    ratedCount: rated.length,
    topRated,
    mostRewatched,
    perYear,
    undated: finished.filter((i) => i.dates.length === 0).length,
    franchises,
    genres,
    years
  }
}

export { TYPES }
