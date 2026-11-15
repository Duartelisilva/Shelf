import { describe, expect, it } from 'vitest'
import { namesOf, removeName, renameName } from '../src/renderer/src/lib/names'
import type { MediaItem } from '../src/shared/types'

const make = (over: Partial<MediaItem> & { id: string }): MediaItem => ({
  type: 'movie',
  status: 'finished',
  title: over.id,
  genres: [],
  dates: [],
  isFavorite: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over
})

const items = [
  make({
    id: 'a',
    title: 'Alien',
    year: 1979,
    genres: ['Horror', 'Sci-Fi'],
    franchise: 'Alien',
    collection: 'Scott'
  }),
  make({
    id: 'b',
    title: 'Aliens',
    year: 1986,
    genres: ['Sci-Fi', 'Science Fiction'],
    franchise: 'Alien'
  }),
  make({ id: 'c', title: 'Dune', type: 'book', genres: ['Sci-Fi'], franchise: 'Dune' })
]

describe('namesOf', () => {
  it('counts the names of one type only, most used first', () => {
    expect(namesOf(items, 'movie', 'genre')).toEqual([
      { name: 'Sci-Fi', count: 2 },
      { name: 'Horror', count: 1 },
      { name: 'Science Fiction', count: 1 }
    ])
    expect(namesOf(items, 'book', 'genre')).toEqual([{ name: 'Sci-Fi', count: 1 }])
    expect(namesOf(items, 'movie', 'franchise')).toEqual([{ name: 'Alien', count: 2 }])
    expect(namesOf(items, 'movie', 'collection')).toEqual([{ name: 'Scott', count: 1 }])
  })
})

describe('renameName', () => {
  it('renames a genre on the items of that type only', () => {
    const result = renameName(items, 'movie', 'genre', 'Horror', 'Terror')
    if (!result.ok) throw new Error(result.error)
    expect(result.changed).toBe(1)
    expect(result.items[0].genres).toEqual(['Terror', 'Sci-Fi'])
    expect(result.items[2].genres).toEqual(['Sci-Fi']) // the book is untouched
  })

  it('merges into an existing name, using its spelling and never repeating a genre on an item', () => {
    const result = renameName(items, 'movie', 'genre', 'Science Fiction', 'sci-fi')
    if (!result.ok) throw new Error(result.error)
    expect(result.items[1].genres).toEqual(['Sci-Fi'])
    expect(namesOf(result.items, 'movie', 'genre').map((u) => u.name)).toEqual(['Sci-Fi', 'Horror'])
  })

  it('renames a franchise and a collection', () => {
    const franchise = renameName(items, 'movie', 'franchise', 'Alien', 'Alien Saga')
    if (!franchise.ok) throw new Error(franchise.error)
    expect(franchise.items.slice(0, 2).map((i) => i.franchise)).toEqual([
      'Alien Saga',
      'Alien Saga'
    ])
    const collection = renameName(items, 'movie', 'collection', 'Scott', 'Ridley Scott')
    if (!collection.ok) throw new Error(collection.error)
    expect(collection.items[0].collection).toBe('Ridley Scott')
  })

  it('refuses an empty name, the same name, and a name nothing uses', () => {
    expect(renameName(items, 'movie', 'genre', 'Horror', '  ').ok).toBe(false)
    expect(renameName(items, 'movie', 'genre', 'Horror', 'Horror').ok).toBe(false)
    expect(renameName(items, 'movie', 'genre', 'Missing', 'Other').ok).toBe(false)
  })

  it('refuses a franchise change that would make two items the same item', () => {
    const twins = [
      make({ id: 'x', title: 'Dark', year: 2017, type: 'series', franchise: 'Dark' }),
      make({ id: 'y', title: 'Dark', year: 2017, type: 'series', franchise: 'Dark 2' })
    ]
    const result = renameName(twins, 'series', 'franchise', 'Dark 2', 'dark')
    expect(result.ok === false && result.error).toContain('same as another item')
    expect(renameName(twins, 'series', 'franchise', 'Dark 2', 'Dark: Origins').ok).toBe(true)
  })
})

describe('removeName', () => {
  it('removes a genre from the items of that type', () => {
    const result = removeName(items, 'movie', 'genre', 'Sci-Fi')
    if (!result.ok) throw new Error(result.error)
    expect(result.changed).toBe(2)
    expect(result.items[0].genres).toEqual(['Horror'])
    expect(result.items[2].genres).toEqual(['Sci-Fi'])
  })

  it('removes a franchise together with the numbers in it, and a collection', () => {
    const withNumbers = items.map((i) =>
      i.franchise === 'Alien' ? { ...i, franchiseOrder: 1 } : i
    )
    const result = removeName(withNumbers, 'movie', 'franchise', 'Alien')
    if (!result.ok) throw new Error(result.error)
    expect(result.items[0].franchise).toBeUndefined()
    expect(result.items[0].franchiseOrder).toBeUndefined()
    const collection = removeName(items, 'movie', 'collection', 'Scott')
    expect(collection.ok && collection.items[0].collection).toBeUndefined()
  })
})
