import { describe, expect, it } from 'vitest'
import { computeStats } from '../src/renderer/src/lib/stats'
import type { MediaItem } from '../src/shared/types'

const make = (over: Partial<MediaItem> & { title: string }): MediaItem => ({
  id: over.title,
  type: 'movie',
  status: 'finished',
  genres: [],
  dates: [],
  isFavorite: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over
})

const items: MediaItem[] = [
  make({
    title: 'Alien',
    genres: ['Horror', 'Sci-Fi'],
    franchise: 'Alien',
    rating: 9,
    dates: ['2024-03-01', '2026-01-05']
  }),
  make({
    title: 'Aliens',
    genres: ['Sci-Fi'],
    franchise: 'Alien',
    rating: 8.5,
    dates: ['2026-02-01']
  }),
  make({ title: 'Heat', rating: 8, dates: ['2025-06-01'] }),
  make({ title: 'Old favorite' }), // finished, no date, no rating
  make({ title: 'Dark', type: 'series', genres: ['Sci-Fi'], rating: 9.5, dates: ['2025-01-01'] }),
  make({ title: 'Dune', type: 'book', genres: ['Fantasy'], dates: ['2026-05-05'] }),
  make({ title: 'Hyperion', type: 'book', status: 'wishlist' })
]

describe('computeStats', () => {
  it('counts finished items per type, always for all three, and leaves the wishlist out', () => {
    for (const type of ['movie', 'series', 'book'] as const) {
      const s = computeStats(items, 'all', 2026, type)
      expect(s.counts).toEqual({ movie: 4, series: 1, book: 1 })
      expect(s.thisYear).toEqual({ movie: 2, series: 0, book: 1 })
      expect(s.wishlist).toBe(1)
    }
  })

  it('works out ratings for the chosen type only', () => {
    const movies = computeStats(items, 'all', 2026, 'movie')
    expect(movies.ratedCount).toBe(3)
    expect(movies.averageRating).toBe(8.5)
    expect(movies.topRated.map((i) => i.title)).toEqual(['Alien', 'Aliens', 'Heat'])
    const series = computeStats(items, 'all', 2026, 'series')
    expect(series.topRated.map((i) => i.title)).toEqual(['Dark'])
    expect(series.averageRating).toBe(9.5)
    const books = computeStats(items, 'all', 2026, 'book')
    expect(books.averageRating).toBeNull()
    expect(books.topRated).toEqual([])
  })

  it('counts an item once per year it was seen, per type, and keeps undated items out of the chart', () => {
    const movies = computeStats(items, 'all', 2026, 'movie')
    expect(movies.perYear).toEqual([
      { year: 2024, count: 1 },
      { year: 2025, count: 1 },
      { year: 2026, count: 2 }
    ])
    expect(movies.undated).toBe(1)
    expect(computeStats(items, 'all', 2026, 'series').perYear).toEqual([{ year: 2025, count: 1 }])
    expect(movies.years).toEqual([2026, 2025, 2024]) // the period selector lists every type's years
  })

  it('filters by year', () => {
    const s = computeStats(items, 2026, 2026, 'movie')
    expect(s.counts).toEqual({ movie: 2, series: 0, book: 1 })
    expect(s.topRated.map((i) => i.title)).toEqual(['Alien', 'Aliens'])
    expect(s.perYear).toHaveLength(3) // the chart always shows the whole history
  })

  it('keeps genres, franchises and rewatches separate for each type', () => {
    const movies = computeStats(items, 'all', 2026, 'movie')
    expect(movies.mostRewatched.map((i) => i.title)).toEqual(['Alien'])
    expect(movies.franchises).toEqual([{ name: 'Alien', items: 2, watches: 3 }])
    expect(movies.genres).toEqual([
      { name: 'Sci-Fi', count: 2 },
      { name: 'Horror', count: 1 }
    ])
    expect(computeStats(items, 'all', 2026, 'series').genres).toEqual([
      { name: 'Sci-Fi', count: 1 }
    ])
    expect(computeStats(items, 'all', 2026, 'book').genres).toEqual([{ name: 'Fantasy', count: 1 }])
  })
})
