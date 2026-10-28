// Everything that talks to TMDB lives in this folder (with openlibrary.ts and
// lookup.ts), so the optional poster lookup can be removed by deleting it. See
// docs/METADATA.md for the full list of what to delete.

import type { KeyCheck, LookupCandidate } from '../../shared/api'

export type TmdbKind = 'movie' | 'tv'
export type TmdbResult<T> = { ok: true; value: T } | { ok: false; error: string }

const IMAGE_BASE = 'https://image.tmdb.org/t/p/'
const IMAGE_PATH = /^\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/

// Only a path that looks like a TMDB image file is ever turned into an address.
export function tmdbImageUrl(path: unknown, size: 'w92' | 'w500'): string | null {
  return typeof path === 'string' && IMAGE_PATH.test(path) ? `${IMAGE_BASE}${size}${path}` : null
}

// TMDB gives out two kinds of credential: a short "API Key" (sent as a query
// parameter) and a long "API Read Access Token" (a JWT, sent as a Bearer header).
export function tmdbRequest(key: string, path: string): { url: string; headers: Record<string, string> } {
  const base = `https://api.themoviedb.org/3${path}`
  const headers: Record<string, string> = { accept: 'application/json' }
  if (key.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${key}`
    return { url: base, headers }
  }
  return { url: `${base}${base.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(key)}`, headers }
}

async function tmdbGet(key: string, path: string, fetchFn: typeof fetch): Promise<TmdbResult<unknown>> {
  const { url, headers } = tmdbRequest(key, path)
  try {
    const response = await fetchFn(url, { headers, signal: AbortSignal.timeout(10_000) })
    if (response.ok) return { ok: true, value: await response.json() }
    if (response.status === 401) return { ok: false, error: 'TMDB did not accept your key. Check it in Settings.' }
    return { ok: false, error: `TMDB answered with an error (${response.status}).` }
  } catch {
    return { ok: false, error: 'Could not reach TMDB. Check your internet connection.' }
  }
}

// Asks TMDB for its (tiny) configuration, which only works with a valid key.
export async function checkTmdbKey(key: string, fetchFn: typeof fetch = fetch): Promise<KeyCheck> {
  const { url, headers } = tmdbRequest(key, '/configuration')
  try {
    const response = await fetchFn(url, { headers, signal: AbortSignal.timeout(10_000) })
    if (response.ok) return { ok: true }
    if (response.status === 401) return { ok: false, error: 'TMDB did not accept this key.' }
    return { ok: false, error: `TMDB answered with an error (${response.status}).` }
  } catch {
    return { ok: false, error: 'Could not reach TMDB. Check your internet connection.' }
  }
}

const yearOf = (date: unknown): number | undefined => {
  const match = typeof date === 'string' ? /^(\d{4})/.exec(date) : null
  return match ? Number(match[1]) : undefined
}
const text = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() ? value.trim() : undefined)
const shorten = (value: string | undefined, max = 220): string | undefined =>
  value && value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value

export interface TmdbMatch {
  candidate: LookupCandidate
  thumbUrl: string | null
}

export async function searchTmdb(
  key: string,
  kind: TmdbKind,
  query: string,
  fetchFn: typeof fetch = fetch
): Promise<TmdbResult<TmdbMatch[]>> {
  const result = await tmdbGet(key, `/search/${kind}?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`, fetchFn)
  if (!result.ok) return result
  const list = (result.value as { results?: unknown })?.results
  const matches: TmdbMatch[] = []
  for (const raw of Array.isArray(list) ? list.slice(0, 8) : []) {
    const r = raw as Record<string, unknown>
    const title = text(kind === 'movie' ? r.title : r.name)
    if (typeof r.id !== 'number' || !title) continue
    matches.push({
      candidate: {
        id: String(r.id),
        source: 'tmdb',
        title,
        year: yearOf(kind === 'movie' ? r.release_date : r.first_air_date),
        overview: shorten(text(r.overview))
      },
      thumbUrl: tmdbImageUrl(r.poster_path, 'w92')
    })
  }
  return { ok: true, value: matches }
}

export interface TmdbDetails {
  year?: number
  yearEnd?: number
  seasons?: number
  genres: string[]
  franchise?: string
  overview?: string
  posterUrl: string | null
}

export async function getTmdbDetails(
  key: string,
  kind: TmdbKind,
  id: string,
  fetchFn: typeof fetch = fetch
): Promise<TmdbResult<TmdbDetails>> {
  if (!/^\d{1,9}$/.test(id)) return { ok: false, error: 'That is not a TMDB id.' }
  const result = await tmdbGet(key, `/${kind}/${id}?language=en-US`, fetchFn)
  if (!result.ok) return result
  const r = result.value as Record<string, unknown>
  const genres = (Array.isArray(r.genres) ? r.genres : [])
    .map((g) => text((g as { name?: unknown })?.name))
    .filter((g): g is string => !!g)

  const details: TmdbDetails = {
    genres,
    overview: text(r.overview),
    posterUrl: tmdbImageUrl(r.poster_path, 'w500')
  }
  if (kind === 'movie') {
    details.year = yearOf(r.release_date)
    // "Alien Collection" suggests the franchise "Alien"
    const collection = text((r.belongs_to_collection as { name?: unknown } | null)?.name)
    if (collection) details.franchise = collection.replace(/\s+Collection$/i, '')
  } else {
    details.year = yearOf(r.first_air_date)
    if (typeof r.number_of_seasons === 'number' && r.number_of_seasons >= 1) details.seasons = r.number_of_seasons
    // An end year only makes sense once the series has ended.
    if (r.status === 'Ended' || r.status === 'Canceled') details.yearEnd = yearOf(r.last_air_date)
  }
  return { ok: true, value: details }
}
