// Everything the Stats page shows, computed from the library. Pure functions,
// no React, covered by tests.
//
// What counts: only finished items (seen or read). An item with several dates
// counts once in the totals, and once in each year it was seen. Items with no
// date count in all-time numbers but cannot appear in any year.
//
// Movies, series and books are different worlds, so everything except the three
// totals is worked out for one type at a time (the `type` argument).

import type { MediaItem, MediaType } from '../../../shared/types'

export type Period = 'all' | number

export interface Stats {
  counts: Record<MediaType, number> // all types, in the period
  thisYear: Record<MediaType, number> // all types: finished items dated in the current year
  wishlist: number
  // The rest is for the chosen type only:
  averageRating: number | null
  ratedCount: number
  topRated: MediaItem[]
  mostRewatched: MediaItem[]
  perYear: { year: number; count: number }[]
  undated: number
  franchises: { name: string; items: number; watches: number }[]
  genres: { name: string; count: number }[]
  years: number[] // years that have at least one date, newest first (for the selector)
}

const yearOf = (iso: string): number => Number(iso.slice(0, 4))
const yearsOf = (item: MediaItem): number[] => [...new Set(item.dates.map(yearOf))]
const perType = (items: MediaItem[]): Record<MediaType, number> => ({
  movie: items.filter((i) => i.type === 'movie').length,
  series: items.filter((i) => i.type === 'series').length,
  book: items.filter((i) => i.type === 'book').length
})

export function computeStats(
  items: MediaItem[],
  period: Period,
  currentYear: number,
  type: MediaType
): Stats {
  const finished = items.filter((i) => i.status === 'finished')
  const inPeriod = period === 'all' ? finished : finished.filter((i) => yearsOf(i).includes(period))
  const mine = inPeriod.filter((i) => i.type === type)
  const allMine = finished.filter((i) => i.type === type)

  const rated = mine.filter((i) => i.rating !== undefined)
  const averageRating = rated.length
    ? Math.round((rated.reduce((sum, i) => sum + (i.rating ?? 0), 0) / rated.length) * 10) / 10
    : null
  const topRated = [...rated]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.title.localeCompare(b.title))
    .slice(0, 5)

  const datesIn = (item: MediaItem): number =>
    period === 'all' ? item.dates.length : item.dates.filter((d) => yearOf(d) === period).length
  const mostRewatched = mine
    .filter((i) => datesIn(i) >= 2)
    .sort((a, b) => datesIn(b) - datesIn(a) || a.title.localeCompare(b.title))
    .slice(0, 5)

  // Items per year always shows the whole history of this type, as context.
  const yearCounts = new Map<number, number>()
  for (const item of allMine)
    for (const y of yearsOf(item)) yearCounts.set(y, (yearCounts.get(y) ?? 0) + 1)
  const typeYears = [...yearCounts.keys()].sort((a, b) => b - a)
  const perYear: Stats['perYear'] = []
  if (typeYears.length > 0) {
    const first = Math.max(typeYears[typeYears.length - 1], typeYears[0] - 9) // at most the last 10 years
    for (let y = first; y <= typeYears[0]; y++)
      perYear.push({ year: y, count: yearCounts.get(y) ?? 0 })
  }

  const groups = new Map<string, { items: number; watches: number }>()
  for (const item of mine) {
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
  for (const item of mine)
    for (const g of item.genres) genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1)
  const genres = [...genreCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 8)

  const allYears = new Set<number>()
  for (const item of finished) for (const y of yearsOf(item)) allYears.add(y)

  return {
    counts: perType(inPeriod),
    thisYear: perType(finished.filter((i) => yearsOf(i).includes(currentYear))),
    wishlist: items.filter((i) => i.status === 'wishlist').length,
    averageRating,
    ratedCount: rated.length,
    topRated,
    mostRewatched,
    perYear,
    undated: allMine.filter((i) => i.dates.length === 0).length,
    franchises,
    genres,
    years: [...allYears].sort((a, b) => b - a)
  }
}
