import { describe, expect, it } from 'vitest'
import type { LookupProposal } from '../src/shared/api'
import { applyReview, buildReview, matchGenres } from '../src/renderer/src/lib/lookup'
import type { MediaItem } from '../src/shared/types'

const item = (over: Partial<MediaItem> = {}): MediaItem => ({
  id: 'a', type: 'movie', status: 'finished', title: 'Alien', genres: [], dates: [], isFavorite: false,
  createdAt: '2026-01-01T00:00:00.000Z', ...over
})
const proposal = (over: Partial<LookupProposal> = {}): LookupProposal => ({
  source: 'tmdb', externalId: '348', year: 1979, genres: ['Horror', 'Science Fiction'], franchise: 'Alien',
  overview: 'In space.', hasPoster: true, ...over
})
const NOW = '2026-10-27T12:00:00.000Z'

describe('matchGenres', () => {
  it('uses the spelling of genres you already have', () => {
    expect(matchGenres(['Science Fiction', 'Horror'], ['Sci-Fi', 'horror'])).toEqual(['Sci-Fi', 'horror'])
    expect(matchGenres(['Science Fiction'], ['Science Fiction'])).toEqual(['Science Fiction'])
  })
  it('writes Science Fiction as Sci-Fi when you have neither', () => {
    expect(matchGenres(['Science Fiction'], [])).toEqual(['Sci-Fi'])
  })
  it('splits TMDB\'s double genres for series, without repeats', () => {
    expect(matchGenres(['Action & Adventure', 'Sci-Fi & Fantasy', 'Action'], ['Sci-Fi'])).toEqual(['Action', 'Adventure', 'Sci-Fi', 'Fantasy'])
  })
})

describe('buildReview', () => {
  it('ticks gaps and leaves franchise unticked, for a bare item', () => {
    const rows = buildReview(item(), proposal(), ['Sci-Fi'])
    expect(rows.map((r) => [r.id, r.checked])).toEqual([
      ['poster', true], ['year', true], ['genre:Horror', true], ['genre:Sci-Fi', true], ['franchise', false]
    ])
  })

  it('leaves unticked what would replace something you entered', () => {
    const mine = item({ image: 'x.png', year: 1980, genres: ['Horror'], franchise: 'Alien Saga' })
    const rows = buildReview(mine, proposal(), [])
    expect(rows.map((r) => [r.id, r.checked])).toEqual([['poster', false], ['year', false], ['genre:Sci-Fi', false]])
  })

  it('does not propose a year outside the allowed range, or one you already have', () => {
    expect(buildReview(item({ year: 1979 }), proposal({ year: 1979, hasPoster: false, genres: [], franchise: undefined }), [])).toEqual([])
    expect(buildReview(item({ type: 'book' }), proposal({ year: 1850, hasPoster: false, genres: [], author: undefined }), [])).toEqual([])
  })

  it('proposes seasons and an end year for a series, and an author for a book', () => {
    const series = buildReview(item({ type: 'series', year: 2017 }), proposal({ year: 2017, yearEnd: 2020, seasons: 3, genres: [], hasPoster: false, franchise: undefined }), [])
    expect(series.map((r) => r.id)).toEqual(['yearEnd', 'seasons'])
    const book = buildReview(item({ type: 'book' }), proposal({ source: 'openlibrary', genres: [], hasPoster: false, franchise: undefined, author: 'Frank Herbert' }), [])
    expect(book.map((r) => [r.id, r.checked])).toContainEqual(['author', true])
  })

  it('does not propose an end year before the start year', () => {
    const rows = buildReview(item({ type: 'series', year: 2020 }), proposal({ year: 2020, yearEnd: 2015, genres: [], hasPoster: false, franchise: undefined }), [])
    expect(rows).toEqual([])
  })
})

describe('applyReview', () => {
  it('applies only the rows given, and records where the details came from', () => {
    const rows = buildReview(item(), proposal(), ['Sci-Fi'])
    const next = applyReview(item(), rows.filter((r) => r.id === 'year' || r.id === 'genre:Sci-Fi'), proposal(), NOW)
    expect(next).toMatchObject({ year: 1979, genres: ['Sci-Fi'] })
    expect(next.franchise).toBeUndefined()
    expect(next.meta).toEqual({ source: 'tmdb', externalId: '348', overview: 'In space.', approvedAt: NOW })
  })

  it('does not change the original item', () => {
    const original = item()
    applyReview(original, buildReview(original, proposal(), []), proposal(), NOW)
    expect(original.year).toBeUndefined()
    expect(original.genres).toEqual([])
  })
})
