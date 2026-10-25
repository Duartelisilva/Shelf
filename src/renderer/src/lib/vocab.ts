// Genres, franchises and collections belong to one kind of item each: the
// genres of books are not the genres of movies. This works out, for each type,
// which names exist, so suggestions and shelves never mix the types.

import type { MediaItem, MediaType } from '../../../shared/types'

export const MEDIA_TYPES: MediaType[] = ['movie', 'series', 'book']
export const TYPE_PLURAL: Record<MediaType, string> = {
  movie: 'Movies',
  series: 'Series',
  book: 'Books'
}

export interface Vocabulary {
  genres: string[] // most used first
  franchises: string[]
  collections: string[]
}

const sorted = (values: (string | undefined)[]): string[] =>
  [...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b))

export function vocabularyFor(items: MediaItem[], type: MediaType): Vocabulary {
  const ofType = items.filter((i) => i.type === type)
  const counts = new Map<string, number>()
  for (const item of ofType)
    for (const genre of item.genres) counts.set(genre, (counts.get(genre) ?? 0) + 1)
  return {
    genres: [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name),
    franchises: sorted(ofType.map((i) => i.franchise)),
    collections: sorted(ofType.map((i) => i.collection))
  }
}

export function vocabularies(items: MediaItem[]): Record<MediaType, Vocabulary> {
  return {
    movie: vocabularyFor(items, 'movie'),
    series: vocabularyFor(items, 'series'),
    book: vocabularyFor(items, 'book')
  }
}
