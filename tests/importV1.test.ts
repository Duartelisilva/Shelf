import { describe, expect, it } from 'vitest'
import { importV1, mergeIntoLibrary, parseV1Json } from '../src/shared/importV1'

let n = 0
const opts = { now: '2026-01-01T00:00:00.000Z', newId: (): string => `id-${++n}` }

const movies = [
  {
    Title: '  The Two   Towers ',
    Year: 2002,
    Saga: 'Fantasy',
    Note: 'Best one',
    IsFavorite: true,
    IsEditing: false,
    BaseColor: { A: 255, R: 35, G: 74, B: 115 },
    WatchDates: ['2024-03-14T00:00:00', '2021-01-02T00:00:00'],
    Franchise: 'The Lord of the Rings',
    FranchiseNumber: 2
  },
  { Title: 'Scream', Year: 1996, Saga: 'Horror', BaseColor: { A: 0, R: 0, G: 0, B: 0 }, WatchDates: [] }
]

describe('importV1', () => {
  it('maps a movie, turning Saga into a genre', () => {
    const { items, genreCounts } = importV1({ movies }, opts)
    const towers = items[0]
    expect(towers).toMatchObject({
      type: 'movie',
      status: 'finished',
      title: 'The Two Towers',
      year: 2002,
      genres: ['Fantasy'],
      franchise: 'The Lord of the Rings',
      franchiseOrder: 2,
      color: '#234a73',
      isFavorite: true,
      notes: 'Best one',
      dates: ['2021-01-02', '2024-03-14']
    })
    expect(genreCounts).toEqual({ Fantasy: 1, Horror: 1 })
  })

  it('treats transparent color as no color and keeps undated library items finished', () => {
    const scream = importV1({ movies }, opts).items[1]
    expect(scream.color).toBeUndefined()
    expect(scream.status).toBe('finished')
    expect(scream.dates).toEqual([])
  })

  it('maps series, books and wishlist items', () => {
    const { items } = importV1(
      {
        series: [{ Title: 'Dark', Year: 2017, YearEnd: 2020, NumberOfSeasons: 3, WatchDates: ['2022-05-01T00:00:00'] }],
        books: [{ Title: 'Dune', Year: 1965, Author: 'Frank Herbert', BookNumber: 1, WatchDates: [] }],
        wishlist: [
          { Title: 'Hyperion', Type: 2, Author: 'Dan Simmons' },
          { Title: 'Shogun', Type: 1, SeasonNumber: 1 },
          { Title: 'Dune: Part Two', Type: 0, Franchise: 'Dune' }
        ]
      },
      opts
    )
    expect(items.find((i) => i.title === 'Dark')).toMatchObject({ type: 'series', yearEnd: 2020, seasons: 3, status: 'finished' })
    expect(items.find((i) => i.title === 'Dune')).toMatchObject({ type: 'book', author: 'Frank Herbert', franchiseOrder: 1 })
    expect(items.find((i) => i.title === 'Hyperion')).toMatchObject({ type: 'book', status: 'wishlist' })
    expect(items.find((i) => i.title === 'Shogun')).toMatchObject({ type: 'series', seasons: 1, status: 'wishlist' })
    expect(items.find((i) => i.title === 'Dune: Part Two')).toMatchObject({ type: 'movie', franchise: 'Dune' })
  })

  it('skips duplicates and untitled entries with a warning', () => {
    const { items, warnings } = importV1({ movies: [movies[1], movies[1], { Year: 2000 }] }, opts)
    expect(items).toHaveLength(1)
    expect(warnings).toHaveLength(2)
  })

  it('handles missing files and a byte-order mark', () => {
    expect(importV1({}, opts).items).toEqual([])
    expect(parseV1Json('\uFEFF[{"Title":"X"}]')).toEqual([{ Title: 'X' }])
  })
})

describe('mergeIntoLibrary', () => {
  it('does not add items that are already in the library', () => {
    const first = importV1({ movies }, opts)
    const library = { version: 1 as const, items: first.items }
    const again = importV1({ movies }, opts)
    const result = mergeIntoLibrary(library, again.items)
    expect(result.added).toBe(0)
    expect(result.skipped).toBe(2)
  })
})
