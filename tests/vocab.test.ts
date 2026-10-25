import { describe, expect, it } from 'vitest'
import { vocabularies, vocabularyFor } from '../src/renderer/src/lib/vocab'
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

const items = [
  make({
    title: 'Alien',
    genres: ['Horror', 'Sci-Fi'],
    franchise: 'Alien',
    collection: 'Ridley Scott'
  }),
  make({ title: 'Aliens', genres: ['Sci-Fi'], franchise: 'Alien' }),
  make({
    title: 'Dune',
    type: 'book',
    genres: ['Fantasy', 'Sci-Fi'],
    franchise: 'Dune',
    author: 'Frank Herbert'
  }),
  make({ title: 'Dark', type: 'series', genres: ['Mystery'], collection: 'Netflix' })
]

describe('vocabulary per type', () => {
  it('only offers names used by items of the same type, most used genres first', () => {
    expect(vocabularyFor(items, 'movie')).toEqual({
      genres: ['Sci-Fi', 'Horror'],
      franchises: ['Alien'],
      collections: ['Ridley Scott']
    })
    expect(vocabularyFor(items, 'book')).toEqual({
      genres: ['Fantasy', 'Sci-Fi'],
      franchises: ['Dune'],
      collections: []
    })
    expect(vocabularyFor(items, 'series')).toEqual({
      genres: ['Mystery'],
      franchises: [],
      collections: ['Netflix']
    })
  })

  it('builds all three at once', () => {
    expect(Object.keys(vocabularies(items))).toEqual(['movie', 'series', 'book'])
  })
})
