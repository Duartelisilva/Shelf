import { describe, expect, it } from 'vitest'
import {
  allMonths,
  availableMonths,
  availableYears,
  calendarWeeks,
  entriesOf,
  monthName,
  monthReview,
  yearReview
} from '../src/renderer/src/lib/periodStats'
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

const TODAY = new Date(2026, 10, 3) // 3 November 2026

const items: MediaItem[] = [
  make({
    title: 'Alien',
    genres: ['Horror', 'Sci-Fi'],
    franchise: 'Alien',
    rating: 9,
    dates: ['2025-10-05', '2026-03-10']
  }),
  make({
    title: 'Aliens',
    genres: ['Sci-Fi'],
    franchise: 'Alien',
    rating: 8,
    dates: ['2026-03-20']
  }),
  make({ title: 'Heat', rating: 7.5, dates: ['2026-03-20', '2026-11-01'] }),
  make({ title: 'Dark', type: 'series', genres: ['Mystery'], rating: 9.5, dates: ['2026-03-05'] }),
  make({ title: 'Dune', type: 'book', dates: ['2026-11-02'] }),
  make({ title: 'Undated' }),
  make({ title: 'Wishlisted', status: 'wishlist', dates: ['2026-03-01'] })
]

describe('available periods', () => {
  it('starts at the first recorded watch and ends now, never before the first or after today', () => {
    expect(availableYears(items, TODAY)).toEqual([2026, 2025])
    expect(availableMonths(items, 2025, TODAY)).toEqual([10, 11, 12]) // nothing before October 2025
    expect(availableMonths(items, 2026, TODAY)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) // nothing after November
    expect(availableMonths(items, 2024, TODAY)).toEqual([])
    expect(availableMonths(items, 2027, TODAY)).toEqual([])
  })

  it('lists all months in order for stepping, and offers only this month when nothing is dated', () => {
    const months = allMonths(items, TODAY)
    expect(months[0]).toEqual({ year: 2025, month: 10 })
    expect(months[months.length - 1]).toEqual({ year: 2026, month: 11 })
    expect(months).toHaveLength(3 + 11)
    expect(allMonths([make({ title: 'x' })], TODAY)).toEqual([{ year: 2026, month: 11 }])
    expect(availableYears([], TODAY)).toEqual([2026])
  })

  it('ignores wishlist items and undated items when finding the first watch', () => {
    const early = [...items, make({ title: 'Old wish', status: 'wishlist', dates: ['2019-01-01'] })]
    expect(availableYears(early, TODAY)).toEqual([2026, 2025])
    expect(entriesOf(items).map((e) => e.date)[0]).toBe('2025-10-05')
  })
})

describe('yearReview', () => {
  const review = yearReview(items, 2026)

  it('counts different items and all watches separately, and leaves out wishlist and undated items', () => {
    expect(review.total).toBe(5) // Alien, Aliens, Heat, Dark, Dune
    expect(review.watches).toBe(6) // Heat twice
    expect(review.byType.movie.count).toBe(3)
    expect(review.byType.series.count).toBe(1)
    expect(review.byType.book.count).toBe(1)
  })

  it('averages ratings per type, and picks the best of each', () => {
    expect(review.byType.movie.averageRating).toBe(8.2) // (9 + 8 + 7.5) / 3 = 8.17
    expect(review.byType.movie.best?.title).toBe('Alien')
    expect(review.byType.series.best?.title).toBe('Dark')
    expect(review.byType.book.averageRating).toBeNull()
    expect(review.byType.book.best).toBeNull()
    expect(review.averageRating).toBe(8.5) // (9 + 8 + 7.5 + 9.5) / 4
  })

  it('counts items per month by type, and finds the busiest month', () => {
    expect(review.perMonth).toHaveLength(12)
    expect(review.perMonth[2]).toEqual({ month: 3, movie: 3, series: 1, book: 0, total: 4 })
    expect(review.perMonth[10]).toEqual({ month: 11, movie: 1, series: 0, book: 1, total: 2 })
    expect(review.busiestMonth).toEqual({ month: 3, count: 4 })
  })

  it('finds the first and last of the year, and what was rewatched', () => {
    expect(review.first?.item.title).toBe('Dark')
    expect(review.first?.date).toBe('2026-03-05')
    expect(review.last?.item.title).toBe('Dune')
    expect(review.mostRewatched).toEqual([{ item: items[2], times: 2 }])
  })

  it('ranks top rated, genres and franchises for each type separately', () => {
    expect(review.topRated.movie.map((i) => i.title)).toEqual(['Alien', 'Aliens', 'Heat'])
    expect(review.topRated.book).toEqual([])
    expect(review.genres.movie).toEqual([
      { name: 'Sci-Fi', count: 2 },
      { name: 'Horror', count: 1 }
    ])
    expect(review.genres.series).toEqual([{ name: 'Mystery', count: 1 }])
    expect(review.franchises.movie).toEqual([{ name: 'Alien', items: 2, watches: 2 }])
  })

  it('is empty for a year without anything', () => {
    const empty = yearReview(items, 2024)
    expect(empty.total).toBe(0)
    expect(empty.busiestMonth).toBeNull()
    expect(empty.first).toBeNull()
    expect(empty.averageRating).toBeNull()
  })

  it('counts an item once in each year it was seen', () => {
    expect(yearReview(items, 2025).total).toBe(1)
    expect(yearReview(items, 2025).first?.item.title).toBe('Alien')
  })
})

describe('monthReview', () => {
  it('lists the entries of the month oldest first, grouped by day', () => {
    const march = monthReview(items, 2026, 3)
    expect(march.entries.map((e) => `${e.date} ${e.item.title}`)).toEqual([
      '2026-03-05 Dark',
      '2026-03-10 Alien',
      '2026-03-20 Aliens',
      '2026-03-20 Heat'
    ])
    expect(Object.keys(march.days)).toEqual(['5', '10', '20'])
    expect(march.days[20].map((e) => e.item.title)).toEqual(['Aliens', 'Heat'])
  })

  it('summarises the month by type', () => {
    const march = monthReview(items, 2026, 3)
    expect(march.total).toBe(4)
    expect(march.byType.movie).toMatchObject({ count: 3, averageRating: 8.2 })
    expect(march.byType.series.best?.title).toBe('Dark')
    expect(march.averageRating).toBe(8.5)
  })

  it('is empty for a month without anything', () => {
    const empty = monthReview(items, 2026, 7)
    expect(empty.total).toBe(0)
    expect(empty.entries).toEqual([])
    expect(empty.averageRating).toBeNull()
  })
})

describe('calendar', () => {
  it('lays a month out in weeks starting on Monday', () => {
    const weeks = calendarWeeks(2026, 11) // 1 November 2026 is a Sunday
    expect(weeks[0]).toEqual([null, null, null, null, null, null, 1])
    expect(weeks[1]).toEqual([2, 3, 4, 5, 6, 7, 8])
    expect(weeks[weeks.length - 1].filter((d) => d !== null).pop()).toBe(30)
    expect(weeks.every((w) => w.length === 7)).toBe(true)
  })

  it('handles a month that starts on Monday and a leap February', () => {
    expect(calendarWeeks(2026, 6)[0][0]).toBe(1) // 1 June 2026 is a Monday
    expect(
      calendarWeeks(2024, 2)
        .flat()
        .filter((d) => d !== null)
    ).toHaveLength(29)
  })

  it('names the months', () => {
    expect(monthName(1)).toBe('January')
    expect(monthName(12)).toBe('December')
  })
})
