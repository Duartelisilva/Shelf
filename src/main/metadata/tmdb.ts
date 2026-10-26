// Everything that talks to TMDB lives in this folder, so the optional poster
// lookup can be removed by deleting it (plus its section in Settings).

import type { KeyCheck } from '../../shared/api'

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
