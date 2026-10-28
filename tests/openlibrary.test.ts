import { describe, expect, it } from 'vitest'
import { OPEN_LIBRARY_USER_AGENT, searchOpenLibrary } from '../src/main/metadata/openlibrary'
import { fakeFetch } from './helpers/fakeFetch'

describe('searchOpenLibrary', () => {
  it('turns search results into candidates and proposals, and identifies the app', async () => {
    const { fetchFn, calls } = fakeFetch([
      {
        match: 'openlibrary.org/search.json',
        reply: {
          json: {
            docs: [
              { key: '/works/OL893415W', title: 'Dune', author_name: ['Frank Herbert', 'Someone Else', 'Third'], first_publish_year: 1965, cover_i: 12345 },
              { key: '/books/OL1M', title: 'Not a work' },
              { key: '/works/OL2W', title: 'No cover or author' }
            ]
          }
        }
      }
    ])
    const result = await searchOpenLibrary('dune', fetchFn)
    expect(calls[0].headers['User-Agent']).toBe(OPEN_LIBRARY_USER_AGENT)
    expect(calls[0].url).toContain('q=dune')
    if (!result.ok) throw new Error('expected a result')
    expect(result.value).toHaveLength(2)
    const [dune, bare] = result.value
    expect(dune.candidate).toMatchObject({ id: 'OL893415W', source: 'openlibrary', title: 'Dune', year: 1965, subtitle: 'Frank Herbert, Someone Else' })
    expect(dune.proposal).toMatchObject({ author: 'Frank Herbert', year: 1965, genres: [], hasPoster: true })
    expect(dune.thumbUrl).toBe('https://covers.openlibrary.org/b/id/12345-S.jpg')
    expect(dune.posterUrl).toBe('https://covers.openlibrary.org/b/id/12345-L.jpg')
    expect(bare.proposal.hasPoster).toBe(false)
    expect(bare.thumbUrl).toBeNull()
  })

  it('explains a server error and a missing connection', async () => {
    const broken = await searchOpenLibrary('x', fakeFetch([{ match: 'openlibrary', reply: { status: 503 } }]).fetchFn)
    expect(broken.ok === false && broken.error).toContain('503')
    const offline = await searchOpenLibrary('x', fakeFetch([]).fetchFn)
    expect(offline.ok === false && offline.error).toContain('Could not reach Open Library')
  })
})
