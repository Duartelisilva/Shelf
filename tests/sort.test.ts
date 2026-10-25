import { describe, expect, it } from 'vitest'
import { compareBy, groupItems } from '../src/renderer/src/lib/library'
import type { MediaItem } from '../src/shared/types'

const make = (over: Partial<MediaItem> & { title: string }): MediaItem => ({
  id: over.title, type: 'movie', status: 'finished', genres: [], dates: [], isFavorite: false,
  createdAt: '2026-01-01T00:00:00.000Z', ...over
})

const items = [
  make({ title: 'Alien', franchise: 'Alien', franchiseOrder: 1, year: 1979, createdAt: '2026-01-01T10:00:00.000Z', rating: 9, dates: ['2025-01-01'] }),
  make({ title: 'Aliens', franchise: 'Alien', franchiseOrder: 2, year: 1986, createdAt: '2026-01-01T10:00:00.000Z', dates: ['2026-02-01'] }),
  make({ title: 'Heat', year: 1995, createdAt: '2026-10-20T09:00:00.000Z' }),
  make({ title: 'Dune: Part Two', status: 'wishlist', year: 2024, createdAt: '2026-10-24T18:30:00.000Z' })
]
const titles = (list: MediaItem[]): string[] => list.map((i) => i.title)

describe('sorting', () => {
  it('puts the most recently added first, ties by title', () => {
    expect(titles([...items].sort(compareBy('added')))).toEqual(['Dune: Part Two', 'Heat', 'Alien', 'Aliens'])
  })
  it('sorts by year, last seen and rating, with missing values last', () => {
    expect(titles([...items].sort(compareBy('year')))[0]).toBe('Dune: Part Two')
    expect(titles([...items].sort(compareBy('seen')))).toEqual(['Aliens', 'Alien', 'Dune: Part Two', 'Heat'])
    expect(titles([...items].sort(compareBy('rating')))[0]).toBe('Alien')
  })
})

describe('grouping with a sort', () => {
  it('keeps franchise numbering with the default sort', () => {
    const shelf = groupItems(items, 'franchise', { wishlistShelf: false }).find((s) => s.title === 'Alien')!
    expect(titles(shelf.items)).toEqual(['Alien', 'Aliens'])
  })
  it('gives a flat list with the newest first, wishlist items included', () => {
    const shelves = groupItems(items, 'none', { wishlistShelf: false, sortBy: 'added' })
    expect(titles(shelves[0].items)).toEqual(['Dune: Part Two', 'Heat', 'Alien', 'Aliens'])
  })
  it('orders shelves by the newest item they hold', () => {
    const shelves = groupItems(items, 'franchise', { wishlistShelf: false, sortBy: 'added' })
    expect(shelves.map((s) => s.title)).toEqual(['Standalone', 'Alien'])
    expect(titles(shelves[0].items)).toEqual(['Dune: Part Two', 'Heat'])
  })
  it('keeps the wishlist shelf last in the Library view', () => {
    const shelves = groupItems(items, 'none', { wishlistShelf: true, sortBy: 'added' })
    expect(shelves.map((s) => s.title)).toEqual(['All', 'Wishlist'])
  })
})
