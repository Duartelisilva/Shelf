// Books come from Open Library, which needs no key. Part of the removable
// metadata folder (see docs/METADATA.md).

import type { LookupCandidate, LookupProposal } from '../../shared/api'
import type { TmdbResult } from './tmdb'

export const OPEN_LIBRARY_USER_AGENT = 'Shelf (https://github.com/Duartelisilva/Shelf)'

export interface BookMatch {
  candidate: LookupCandidate
  proposal: LookupProposal
  thumbUrl: string | null
  posterUrl: string | null
}

const WORK_KEY = /^\/works\/(OL\d+W)$/
const coverUrl = (id: unknown, size: 'S' | 'L'): string | null =>
  typeof id === 'number' && Number.isInteger(id) && id > 0 ? `https://covers.openlibrary.org/b/id/${id}-${size}.jpg` : null

export async function searchOpenLibrary(query: string, fetchFn: typeof fetch = fetch): Promise<TmdbResult<BookMatch[]>> {
  const url =
    'https://openlibrary.org/search.json?limit=8&fields=key,title,author_name,first_publish_year,cover_i&q=' +
    encodeURIComponent(query)
  let json: unknown
  try {
    const response = await fetchFn(url, {
      headers: { accept: 'application/json', 'User-Agent': OPEN_LIBRARY_USER_AGENT },
      signal: AbortSignal.timeout(10_000)
    })
    if (!response.ok) return { ok: false, error: `Open Library answered with an error (${response.status}).` }
    json = await response.json()
  } catch {
    return { ok: false, error: 'Could not reach Open Library. Check your internet connection.' }
  }

  const docs = (json as { docs?: unknown })?.docs
  const matches: BookMatch[] = []
  for (const raw of Array.isArray(docs) ? docs.slice(0, 8) : []) {
    const d = raw as Record<string, unknown>
    const id = typeof d.key === 'string' ? WORK_KEY.exec(d.key)?.[1] : undefined
    const title = typeof d.title === 'string' && d.title.trim() ? d.title.trim() : undefined
    if (!id || !title) continue
    const authors = Array.isArray(d.author_name) ? d.author_name.filter((a): a is string => typeof a === 'string') : []
    const year = typeof d.first_publish_year === 'number' ? d.first_publish_year : undefined
    matches.push({
      candidate: { id, source: 'openlibrary', title, year, subtitle: authors.slice(0, 2).join(', ') || undefined },
      proposal: {
        source: 'openlibrary',
        externalId: id,
        year,
        genres: [], // Open Library subjects are too many and too noisy to suggest
        author: authors[0],
        hasPoster: coverUrl(d.cover_i, 'L') !== null
      },
      thumbUrl: coverUrl(d.cover_i, 'S'),
      posterUrl: coverUrl(d.cover_i, 'L')
    })
  }
  return { ok: true, value: matches }
}
