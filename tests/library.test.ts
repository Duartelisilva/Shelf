import { describe, expect, it } from 'vitest'
import {
  activeFilterCount,
  applyFilters,
  formatDate,
  genreOptions,
  groupItems,
  lastDate,
  posterColor,
  readableOn,
  sectionCounts,
  sectionItems
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
  make({
    title: 'Alien',
    year: 1979,
    genres: ['Horror', 'Sci-Fi'],
    franchise: 'Alien',
    franchiseOrder: 1
  }),
  make({
    title: 'Aliens',
    year: 1986,
    genres: ['Sci-Fi'],
    franchise: 'Alien',
    franchiseOrder: 2,
    isFavorite: true
  }),
  make({ title: 'Amélie', year: 2001, genres: ['Comedy'] }),
  make({ title: 'Dark', type: 'series', genres: ['Sci-Fi'], dates: ['2022-05-01', '2024-01-02'] }),
  make({
    title: 'Hyperion',
    type: 'book',
    status: 'wishlist',
    author: 'Dan Simmons',
    genres: ['Sci-Fi']
  })
]

describe('sections', () => {
  it('counts each sidebar entry; wishlist items stay out of Movies, Series and Books', () => {
    expect(sectionCounts(items)).toEqual({
      library: 5,
      movie: 3,
      series: 1,
      book: 0,
      'in-progress': 0,
      wishlist: 1,
      favorites: 1
    })
  })
})

describe('filters', () => {
  const base = { section: 'library' as const, query: '', genre: null, favoritesOnly: false }

  it('searches title, author and genre, ignoring accents and case', () => {
    expect(applyFilters(items, { ...base, query: 'amelie' }).map((i) => i.title)).toEqual([
      'Amélie'
    ])
    expect(applyFilters(items, { ...base, query: 'simmons' }).map((i) => i.title)).toEqual([
      'Hyperion'
    ])
    expect(applyFilters(items, { ...base, query: 'horror alien' }).map((i) => i.title)).toEqual([
      'Alien'
    ])
  })

  it('filters by genre and favorites together', () => {
    const result = applyFilters(items, {
      ...base,
      genre: { type: 'movie', name: 'Sci-Fi' },
      favoritesOnly: true
    })
    expect(result.map((i) => i.title)).toEqual(['Aliens'])
  })

  it('lists genres by how many items of the same type have them', () => {
    expect(genreOptions(items)[0]).toEqual({ type: 'movie', name: 'Sci-Fi', count: 2 })
    // the same genre name on a series and a book are separate entries
    expect(genreOptions(items).filter((g) => g.name === 'Sci-Fi')).toHaveLength(3)
  })

  it('filters a genre only within its own type', () => {
    const seriesSciFi = applyFilters(items, { ...base, genre: { type: 'series', name: 'Sci-Fi' } })
    expect(seriesSciFi.map((i) => i.title)).toEqual(['Dark'])
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
    const titlesOn = (name: string, tag: string): string[] =>
      shelves.find((s) => s.title === name && s.tag === tag)!.items.map((i) => i.title)
    expect(titlesOn('Horror', 'Movies')).toEqual(['Alien'])
    expect(titlesOn('Sci-Fi', 'Movies')).toContain('Alien')
  })

  it('keeps a genre of movies, series and books on separate shelves, tagged by type', () => {
    const shelves = groupItems(items, 'genre', { wishlistShelf: false })
    const sciFi = shelves.filter((s) => s.title === 'Sci-Fi')
    expect(sciFi.map((s) => s.tag)).toEqual(['Movies', 'Series', 'Books'])
    expect(sciFi.map((s) => s.items.map((i) => i.title))).toEqual([
      ['Alien', 'Aliens'],
      ['Dark'],
      ['Hyperion']
    ])
  })

  it('shows no type tag when only one type is on screen', () => {
    const movies = items.filter((i) => i.type === 'movie')
    expect(
      groupItems(movies, 'genre', { wishlistShelf: false }).every((s) => s.tag === undefined)
    ).toBe(true)
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

describe('In progress section', () => {
  it('lists everything being watched or read, across types', () => {
    const list: MediaItem[] = [
      { ...items[3], status: 'in-progress' },
      { ...items[4], status: 'in-progress' },
      items[0]
    ]
    expect(sectionItems(list, 'in-progress').map((i) => i.title)).toEqual(['Dark', 'Hyperion'])
    expect(sectionCounts(list)['in-progress']).toBe(2)
  })
})

describe('year, rating and missing filters', () => {
  const base = { section: 'library' as const, query: '', genre: null, favoritesOnly: false }
  const list: MediaItem[] = [
    { ...items[0], year: 1979, rating: 9, genres: ['Horror'], image: 'a.png' },
    { ...items[1], year: 1995, rating: 6, genres: [] },
    { ...items[2], year: undefined, genres: [] }
  ]
  const titles = (filters: object): string[] =>
    applyFilters(list, { ...base, ...filters }).map((i) => i.title)

  it('limits by year, leaving out items that have none', () => {
    expect(titles({ yearFrom: 1990 })).toEqual([list[1].title])
    expect(titles({ yearTo: 1990 })).toEqual([list[0].title])
    expect(titles({ yearFrom: 1979, yearTo: 1995 })).toEqual([list[0].title, list[1].title])
  })

  it('limits by minimum rating, leaving out unrated items', () => {
    expect(titles({ minRating: 7 })).toEqual([list[0].title])
    expect(titles({ minRating: 6 })).toEqual([list[0].title, list[1].title])
  })

  it('finds what is missing: genre, image, rating, and combinations', () => {
    expect(titles({ missing: ['genre'] })).toEqual([list[1].title, list[2].title])
    expect(titles({ missing: ['image'] })).toEqual([list[1].title, list[2].title])
    expect(titles({ missing: ['rating'] })).toEqual([list[2].title])
    expect(titles({ missing: ['genre', 'rating'] })).toEqual([list[2].title])
  })

  it('counts the filters that are on', () => {
    expect(activeFilterCount({ favoritesOnly: false, genre: null })).toBe(0)
    expect(
      activeFilterCount({
        favoritesOnly: true,
        genre: null,
        yearFrom: 1990,
        yearTo: 2000,
        minRating: 7,
        missing: ['genre', 'image']
      })
    ).toBe(5)
  })
})
