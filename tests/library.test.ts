import { describe, expect, it } from 'vitest'
import {
  applyFilters,
  formatDate,
  genreOptions,
  groupItems,
  lastDate,
  posterColor,
  readableOn,
  sectionCounts
} from '../src/renderer/src/lib/library'
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
  make({ title: 'Alien', year: 1979, genres: ['Horror', 'Sci-Fi'], franchise: 'Alien', franchiseOrder: 1 }),
  make({ title: 'Aliens', year: 1986, genres: ['Sci-Fi'], franchise: 'Alien', franchiseOrder: 2, isFavorite: true }),
  make({ title: 'Amélie', year: 2001, genres: ['Comedy'] }),
  make({ title: 'Dark', type: 'series', genres: ['Sci-Fi'], dates: ['2022-05-01', '2024-01-02'] }),
  make({ title: 'Hyperion', type: 'book', status: 'wishlist', author: 'Dan Simmons', genres: ['Sci-Fi'] })
]

describe('sections', () => {
  it('counts each sidebar entry; wishlist items stay out of Movies, Series and Books', () => {
    expect(sectionCounts(items)).toEqual({
      library: 5, movie: 3, series: 1, book: 0, wishlist: 1, favorites: 1
    })
  })
})

describe('filters', () => {
  const base = { section: 'library' as const, query: '', genre: null, favoritesOnly: false }

  it('searches title, author and genre, ignoring accents and case', () => {
    expect(applyFilters(items, { ...base, query: 'amelie' }).map((i) => i.title)).toEqual(['Amélie'])
    expect(applyFilters(items, { ...base, query: 'simmons' }).map((i) => i.title)).toEqual(['Hyperion'])
    expect(applyFilters(items, { ...base, query: 'horror alien' }).map((i) => i.title)).toEqual(['Alien'])
  })

  it('filters by genre and favorites together', () => {
    const result = applyFilters(items, { ...base, genre: 'Sci-Fi', favoritesOnly: true })
    expect(result.map((i) => i.title)).toEqual(['Aliens'])
  })

  it('lists genres by how many items have them', () => {
    expect(genreOptions(items)[0]).toEqual({ name: 'Sci-Fi', count: 4 })
  })
})

describe('grouping', () => {
  it('groups by franchise in franchise order, with the rest under Standalone', () => {
    const shelves = groupItems(items, 'franchise', { wishlistShelf: false })
    expect(shelves[0].title).toBe('Alien')
    expect(shelves[0].items.map((i) => i.title)).toEqual(['Alien', 'Aliens'])
    expect(shelves.at(-1)?.title).toBe('Standalone')
  })

  it('puts an item with two genres on both genre shelves', () => {
    const shelves = groupItems(items, 'genre', { wishlistShelf: false })
    const titlesOn = (name: string): string[] =>
      shelves.find((s) => s.title === name)!.items.map((i) => i.title)
    expect(titlesOn('Horror')).toEqual(['Alien'])
    expect(titlesOn('Sci-Fi')).toContain('Alien')
  })

  it('pulls the wishlist into its own last shelf when asked', () => {
    const shelves = groupItems(items, 'none', { wishlistShelf: true })
    expect(shelves.map((s) => s.title)).toEqual(['All', 'Wishlist'])
    expect(shelves[1].items.map((i) => i.title)).toEqual(['Hyperion'])
  })
})

describe('presentation helpers', () => {
  it('uses the same color for a whole franchise, and the item color when it has one', () => {
    expect(posterColor(items[0])).toBe(posterColor(items[1]))
    expect(posterColor(make({ title: 'X', color: '#123456' }))).toBe('#123456')
  })

  it('picks readable text for light and dark backgrounds', () => {
    expect(readableOn('#f0f8ff')).toBe('#0f1115')
    expect(readableOn('#234a73')).toBe('#ffffff')
  })

  it('formats dates as day/month/year and finds the latest', () => {
    expect(formatDate('2026-08-10')).toBe('10/08/2026')
    expect(lastDate(items[3])).toBe('2024-01-02')
  })
})
