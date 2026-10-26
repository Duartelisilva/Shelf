import { describe, expect, it } from 'vitest'
import { checkTmdbKey, tmdbRequest } from '../src/main/metadata/tmdb'

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
