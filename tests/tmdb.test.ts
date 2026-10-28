import { describe, expect, it } from 'vitest'
import { checkTmdbKey, getTmdbDetails, searchTmdb, tmdbImageUrl, tmdbRequest } from '../src/main/metadata/tmdb'
import { fakeFetch as router } from './helpers/fakeFetch'

const KEY = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'
const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJ4In0.signature_part-1'

function fakeFetch(respond: () => { ok: boolean; status: number } | Error): { fetchFn: typeof fetch; calls: { url: string; headers: Record<string, string> }[] } {
  const calls: { url: string; headers: Record<string, string> }[] = []
  const fetchFn = (async (url: string, init?: { headers?: Record<string, string> }) => {
    calls.push({ url, headers: init?.headers ?? {} })
    const result = respond()
    if (result instanceof Error) throw result
    return result as Response
  }) as unknown as typeof fetch
  return { fetchFn, calls }
}

describe('TMDB requests', () => {
  it('sends a short API key as a query parameter, without an Authorization header', () => {
    const { url, headers } = tmdbRequest(KEY, '/configuration')
    expect(url).toBe(`https://api.themoviedb.org/3/configuration?api_key=${KEY}`)
    expect(headers.Authorization).toBeUndefined()
  })

  it('sends a read access token as a Bearer header, and never in the address', () => {
    const { url, headers } = tmdbRequest(TOKEN, '/configuration')
    expect(url).toBe('https://api.themoviedb.org/3/configuration')
    expect(headers.Authorization).toBe(`Bearer ${TOKEN}`)
  })
})

describe('checkTmdbKey', () => {
  it('accepts a key TMDB accepts', async () => {
    const { fetchFn, calls } = fakeFetch(() => ({ ok: true, status: 200 }))
    expect(await checkTmdbKey(KEY, fetchFn)).toEqual({ ok: true })
    expect(calls).toHaveLength(1)
  })

  it('explains a rejected key, a server error and no connection', async () => {
    const rejected = await checkTmdbKey(KEY, fakeFetch(() => ({ ok: false, status: 401 })).fetchFn)
    expect(rejected).toEqual({ ok: false, error: 'TMDB did not accept this key.' })
    const broken = await checkTmdbKey(KEY, fakeFetch(() => ({ ok: false, status: 500 })).fetchFn)
    expect(broken.ok === false && broken.error).toContain('500')
    const offline = await checkTmdbKey(KEY, fakeFetch(() => new Error('offline')).fetchFn)
    expect(offline.ok === false && offline.error).toContain('Could not reach TMDB')
  })
})

describe('TMDB poster addresses', () => {
  it('only accepts paths that look like a TMDB image file', () => {
    expect(tmdbImageUrl('/abc123.jpg', 'w92')).toBe('https://image.tmdb.org/t/p/w92/abc123.jpg')
    expect(tmdbImageUrl('/abc123.jpg', 'w500')).toBe('https://image.tmdb.org/t/p/w500/abc123.jpg')
    for (const bad of ['http://evil.example/x.jpg', '/../x.jpg', '/a/b.jpg', '', null, undefined, 5]) {
      expect(tmdbImageUrl(bad, 'w92')).toBeNull()
    }
  })
})

describe('searchTmdb', () => {
  const longText = 'word '.repeat(80)

  it('turns movie results into candidates with year, shortened overview and thumbnail address', async () => {
    const { fetchFn, calls } = router([
      {
        match: '/search/movie',
        reply: {
          json: {
            results: [
              { id: 348, title: 'Alien', release_date: '1979-05-25', overview: longText, poster_path: '/alien.jpg' },
              { id: 1, overview: 'no title, skipped' },
              { id: 679, title: 'Aliens', release_date: '1986-07-18', poster_path: null }
            ]
          }
        }
      }
    ])
    const result = await searchTmdb(KEY, 'movie', 'Alien 3', fetchFn)
    expect(calls[0].url).toContain('/search/movie?query=Alien%203')
    expect(calls[0].url).toContain(`api_key=${KEY}`)
    if (!result.ok) throw new Error('expected a result')
    expect(result.value.map((m) => m.candidate.title)).toEqual(['Alien', 'Aliens'])
    expect(result.value[0].candidate).toMatchObject({ id: '348', source: 'tmdb', year: 1979 })
    expect(result.value[0].candidate.overview?.endsWith('…')).toBe(true)
    expect(result.value[0].candidate.overview?.length).toBeLessThanOrEqual(220)
    expect(result.value[0].thumbUrl).toBe('https://image.tmdb.org/t/p/w92/alien.jpg')
    expect(result.value[1].thumbUrl).toBeNull()
  })

  it('reads series with their own field names', async () => {
    const { fetchFn } = router([{ match: '/search/tv', reply: { json: { results: [{ id: 70523, name: 'Dark', first_air_date: '2017-12-01' }] } } }])
    const result = await searchTmdb(KEY, 'tv', 'Dark', fetchFn)
    if (!result.ok) throw new Error('expected a result')
    expect(result.value[0].candidate).toMatchObject({ id: '70523', title: 'Dark', year: 2017 })
  })

  it('explains a rejected key and a missing connection', async () => {
    const rejected = await searchTmdb(KEY, 'movie', 'x', router([{ match: '/search', reply: { status: 401 } }]).fetchFn)
    expect(rejected.ok === false && rejected.error).toContain('key')
    const offline = await searchTmdb(KEY, 'movie', 'x', router([]).fetchFn)
    expect(offline.ok === false && offline.error).toContain('Could not reach TMDB')
  })
})

describe('getTmdbDetails', () => {
  it('reads a movie: year, genres, a franchise from its collection and the poster', async () => {
    const { fetchFn } = router([
      {
        match: '/movie/348',
        reply: {
          json: {
            release_date: '1979-05-25', overview: 'In space.', poster_path: '/alien.jpg',
            genres: [{ id: 27, name: 'Horror' }, { id: 878, name: 'Science Fiction' }],
            belongs_to_collection: { id: 8091, name: 'Alien Collection' }
          }
        }
      }
    ])
    const result = await getTmdbDetails(KEY, 'movie', '348', fetchFn)
    if (!result.ok) throw new Error('expected details')
    expect(result.value).toMatchObject({
      year: 1979, genres: ['Horror', 'Science Fiction'], franchise: 'Alien', overview: 'In space.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/alien.jpg'
    })
  })

  it('reads a series: seasons, and an end year only once it has ended', async () => {
    const ended = router([{ match: '/tv/70523', reply: { json: { first_air_date: '2017-12-01', last_air_date: '2020-06-27', number_of_seasons: 3, status: 'Ended', genres: [] } } }])
    const a = await getTmdbDetails(KEY, 'tv', '70523', ended.fetchFn)
    if (!a.ok) throw new Error('expected details')
    expect(a.value).toMatchObject({ year: 2017, yearEnd: 2020, seasons: 3 })
    const running = router([{ match: '/tv/1', reply: { json: { first_air_date: '2022-02-18', last_air_date: '2025-05-01', number_of_seasons: 3, status: 'Returning Series', genres: [] } } }])
    const b = await getTmdbDetails(KEY, 'tv', '1', running.fetchFn)
    if (!b.ok) throw new Error('expected details')
    expect(b.value.yearEnd).toBeUndefined()
    expect(b.value.seasons).toBe(3)
  })

  it('refuses an id that is not a number, without asking TMDB', async () => {
    const { fetchFn, calls } = router([])
    expect((await getTmdbDetails(KEY, 'movie', '../secret', fetchFn)).ok).toBe(false)
    expect(calls).toHaveLength(0)
  })
})
