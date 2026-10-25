import { describe, expect, it } from 'vitest'
import { computeStats } from '../src/renderer/src/lib/stats'
import type { MediaItem } from '../src/shared/types'

const make = (over: Partial<MediaItem> & { title: string }): MediaItem => ({
  id: over.title, type: 'movie', status: 'finished', genres: [], dates: [], isFavorite: false,
  createdAt: '2026-01-01T00:00:00.000Z', ...over
})

const items: MediaItem[] = [
  make({ title: 'Alien', genres: ['Horror', 'Sci-Fi'], franchise: 'Alien', rating: 9, dates: ['2024-03-01', '2026-01-05'] }),
  make({ title: 'Aliens', genres: ['Sci-Fi'], franchise: 'Alien', rating: 8.5, dates: ['2026-02-01'] }),
  make({ title: 'Heat', rating: 8, dates: ['2025-06-01'] }),
  make({ title: 'Old favorite' }), // finished, no date, no rating
  make({ title: 'Dark', type: 'series', rating: 9.5, dates: ['2025-01-01'] }),
  make({ title: 'Dune', type: 'book', dates: ['2026-05-05'] }),
  make({ title: 'Hyperion', type: 'book', status: 'wishlist' })
]

describe('computeStats', () => {
  it('counts finished items per type and leaves the wishlist out', () => {
    const s = computeStats(items, 'all', 2026)
    expect(s.counts).toEqual({ movie: 4, series: 1, book: 1 })
    expect(s.wishlist).toBe(1)
    expect(s.thisYear).toEqual({ movie: 2, series: 0, book: 1 })
  })

  it('averages the ratings that exist', () => {
    const s = computeStats(items, 'all', 2026)
    expect(s.ratedCount).toBe(4)
    expect(s.averageRating).toBe(8.8)
    expect(computeStats([make({ title: 'x' })], 'all', 2026).averageRating).toBeNull()
  })

  it('ranks the top rated per type', () => {
    const s = computeStats(items, 'all', 2026)
    expect(s.topRated.movie.map((i) => i.title)).toEqual(['Alien', 'Aliens', 'Heat'])
    expect(s.topRated.series.map((i) => i.title)).toEqual(['Dark'])
    expect(s.topRated.book).toEqual([])
  })

  it('counts an item once per year it was seen, and keeps undated items out of the chart', () => {
    const s = computeStats(items, 'all', 2026)
    expect(s.perYear).toEqual([
      { year: 2024, count: 1 }, { year: 2025, count: 2 }, { year: 2026, count: 3 }
    ])
    expect(s.undated).toBe(1)
    expect(s.years).toEqual([2026, 2025, 2024])
  })

  it('filters everything by year', () => {
    const s = computeStats(items, 2026, 2026)
    expect(s.counts).toEqual({ movie: 2, series: 0, book: 1 })
    expect(s.topRated.movie.map((i) => i.title)).toEqual(['Alien', 'Aliens'])
    expect(s.perYear).toHaveLength(3) // the chart always shows the whole history
  })

  it('finds rewatched items, franchises with two or more items, and genres', () => {
    const s = computeStats(items, 'all', 2026)
    expect(s.mostRewatched.map((i) => i.title)).toEqual(['Alien'])
    expect(s.franchises).toEqual([{ name: 'Alien', items: 2, watches: 3 }])
    expect(s.genres).toEqual([{ name: 'Sci-Fi', count: 2 }, { name: 'Horror', count: 1 }])
  })
})
