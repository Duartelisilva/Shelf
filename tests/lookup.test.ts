import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MAX_IMAGE_BYTES, createImageStore } from '../src/main/imageStore'
import { createLookup } from '../src/main/metadata/lookup'
import { fakeFetch } from './helpers/fakeFetch'
import type { Route } from './helpers/fakeFetch'

const ID = '123e4567-e89b-12d3-a456-426614174000'
const KEY = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'
const POSTER = Buffer.from('poster bytes')
const movieRoutes: Route[] = [
  { match: '/search/movie', reply: { json: { results: [{ id: 348, title: 'Alien', release_date: '1979-05-25', poster_path: '/alien.jpg' }] } } },
  { match: '/movie/348', reply: { json: { release_date: '1979-05-25', poster_path: '/alien.jpg', genres: [{ name: 'Horror' }] } } },
  { match: 'image.tmdb.org/t/p/w92', reply: { bytes: Buffer.from('thumb') } },
  { match: 'image.tmdb.org/t/p/w500', reply: { bytes: POSTER } }
]

async function setup(key: string | null, routes: Route[] = movieRoutes): Promise<{ lookup: ReturnType<typeof createLookup>; images: ReturnType<typeof createImageStore>; calls: { url: string }[] }> {
  const images = createImageStore(join(await mkdtemp(join(tmpdir(), 'shelf-lookup-')), 'images'))
  const { fetchFn, calls } = fakeFetch(routes)
  return { lookup: createLookup({ getTmdbKey: async () => key, images, fetchFn }), images, calls }
}

describe('lookup of movies and series', () => {
  it('asks for a key instead of searching when there is none', async () => {
    const { lookup, calls } = await setup(null)
    const result = await lookup.search('movie', 'Alien')
    expect(result.ok === false && result.error).toContain('TMDB key')
    expect(calls).toHaveLength(0)
  })

  it('searches, with a small picture for each match as a data address', async () => {
    const { lookup } = await setup(KEY)
    const result = await lookup.search('movie', 'Alien')
    if (!result.ok) throw new Error('expected candidates')
    expect(result.candidates[0]).toMatchObject({ id: '348', title: 'Alien', year: 1979 })
    expect(result.candidates[0].thumb?.startsWith('data:image/jpeg;base64,')).toBe(true)
  })

  it('still returns the matches when a thumbnail cannot be fetched', async () => {
    const { lookup } = await setup(KEY, [movieRoutes[0]])
    const result = await lookup.search('movie', 'Alien')
    if (!result.ok) throw new Error('expected candidates')
    expect(result.candidates[0].thumb).toBeUndefined()
  })

  it('gives details, then stores the poster as the item\'s own image', async () => {
    const { lookup, images } = await setup(KEY)
    const details = await lookup.details('movie', 'tmdb', '348')
    if (!details.ok) throw new Error('expected details')
    expect(details.proposal).toMatchObject({ source: 'tmdb', externalId: '348', year: 1979, genres: ['Horror'], hasPoster: true })

    const saved = await lookup.downloadPoster(ID, 'tmdb', '348')
    if ('error' in saved) throw new Error(saved.error)
    expect(saved.fileName.startsWith(ID)).toBe(true)
    expect((await images.read(saved.fileName))?.toString()).toBe('poster bytes')
  })

  it('does not fetch a poster it was not told about', async () => {
    const { lookup, calls } = await setup(KEY)
    const result = await lookup.downloadPoster(ID, 'tmdb', '348')
    expect('error' in result && result.error).toContain('again')
    expect(calls).toHaveLength(0)
  })

  it('refuses something that is not an image, and an image that is too large', async () => {
    const notImage = await setup(KEY, [movieRoutes[1], { match: 'w500', reply: { bytes: Buffer.from('<html>'), type: 'text/html' } }])
    await notImage.lookup.details('movie', 'tmdb', '348')
    const a = await notImage.lookup.downloadPoster(ID, 'tmdb', '348')
    expect('error' in a && a.error).toContain('usable image')

    const huge = await setup(KEY, [movieRoutes[1], { match: 'w500', reply: { bytes: Buffer.alloc(MAX_IMAGE_BYTES + 1) } }])
    await huge.lookup.details('movie', 'tmdb', '348')
    const b = await huge.lookup.downloadPoster(ID, 'tmdb', '348')
    expect('error' in b && b.error).toContain('15 MB')
  })
})

describe('lookup of books', () => {
  const bookRoutes: Route[] = [
    { match: 'openlibrary.org/search.json', reply: { json: { docs: [{ key: '/works/OL893415W', title: 'Dune', author_name: ['Frank Herbert'], first_publish_year: 1965, cover_i: 12345 }] } } },
    { match: '12345-S.jpg', reply: { bytes: Buffer.from('thumb') } },
    { match: '12345-L.jpg', reply: { bytes: POSTER } }
  ]

  it('needs no key: search, details and poster', async () => {
    const { lookup, images } = await setup(null, bookRoutes)
    const search = await lookup.search('book', 'dune')
    if (!search.ok) throw new Error('expected candidates')
    expect(search.candidates[0]).toMatchObject({ id: 'OL893415W', subtitle: 'Frank Herbert' })

    const details = await lookup.details('book', 'openlibrary', 'OL893415W')
    if (!details.ok) throw new Error('expected details')
    expect(details.proposal).toMatchObject({ author: 'Frank Herbert', year: 1965 })

    const saved = await lookup.downloadPoster(ID, 'openlibrary', 'OL893415W')
    if ('error' in saved) throw new Error(saved.error)
    expect((await images.read(saved.fileName))?.toString()).toBe('poster bytes')
  })

  it('asks to search again for a book it has not seen', async () => {
    const { lookup } = await setup(null, bookRoutes)
    const result = await lookup.details('book', 'openlibrary', 'OL1W')
    expect(result.ok === false && result.error).toContain('Search again')
  })
})
