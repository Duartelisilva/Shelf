// Books come from Open Library, which needs no key. Part of the removable
// metadata folder (see docs/METADATA.md).

import type { LookupCandidate, LookupProposal } from '../../shared/api'
import type { TmdbResult } from './tmdb'

const SEARCH_TIMEOUT_MS = 20_000

// Open Library lists dozens of "subjects" per book, many of them not genres at all
// ("Large type books", "Open Library Staff Picks"). Only subjects that match this
// short list of real genres are used.
const GENRE_RULES: [RegExp, string][] = [
  [/\bfantasy\b/, 'Fantasy'],
  [/science fiction|sci-fi/, 'Science Fiction'],
  [/\bmystery\b|detective/, 'Mystery'],
  [/thriller|suspense/, 'Thriller'],
  [/\bhorror\b/, 'Horror'],
  [/\bromance\b|love stories/, 'Romance'],
  [/historical fiction/, 'Historical Fiction'],
  [/\bhistory\b/, 'History'],
  [/biograph|memoir/, 'Biography'],
  [/\bcrime\b/, 'Crime'],
  [/\badventure/, 'Adventure'],
  [/young adult/, 'Young Adult'],
  [/dystopia/, 'Dystopian'],
  [/\bclassic/, 'Classics'],
  [/philosophy/, 'Philosophy'],
  [/psycholog/, 'Psychology'],
  [/self-help|self help/, 'Self-help'],
  [/humou?r|\bcomedy\b/, 'Humor'],
  [/graphic novel|comics/, 'Graphic Novel'],
  [/\bpoetry\b/, 'Poetry']
]

// The (at most three) genres that most of a book's subjects point to.
export function genresFromSubjects(subjects: unknown): string[] {
  if (!Array.isArray(subjects)) return []
  const counts = new Map<string, number>()
  for (const raw of subjects) {
    if (typeof raw !== 'string') continue
    const subject = raw.toLowerCase()
    for (const [pattern, genre] of GENRE_RULES) {
      if (pattern.test(subject)) counts.set(genre, (counts.get(genre) ?? 0) + 1)
    }
  }
  const order = GENRE_RULES.map(([, genre]) => genre)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || order.indexOf(a[0]) - order.indexOf(b[0]))
    .slice(0, 3)
    .map(([genre]) => genre)
}

export const OPEN_LIBRARY_USER_AGENT = 'Shelf (https://github.com/Duartelisilva/Shelf)'

export interface BookMatch {
  candidate: LookupCandidate
  proposal: LookupProposal
  thumbUrl: string | null
  posterUrl: string | null
}

const WORK_KEY = /^\/works\/(OL\d+W)$/
const coverUrl = (id: unknown, size: 'S' | 'L'): string | null =>
  typeof id === 'number' && Number.isInteger(id) && id > 0
    ? `https://covers.openlibrary.org/b/id/${id}-${size}.jpg`
    : null

export async function searchOpenLibrary(
  query: string,
  fetchFn: typeof fetch = fetch
): Promise<TmdbResult<BookMatch[]>> {
  const url =
    'https://openlibrary.org/search.json?limit=8&fields=key,title,author_name,first_publish_year,cover_i,subject&q=' +
    encodeURIComponent(query)
  let json: unknown
  try {
    const response = await fetchFn(url, {
      headers: { accept: 'application/json', 'User-Agent': OPEN_LIBRARY_USER_AGENT },
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS)
    })
    if (!response.ok)
      return { ok: false, error: `Open Library answered with an error (${response.status}).` }
    json = await response.json()
  } catch (error) {
    // Open Library's search is free but can be slow, so a timeout is not the same as being offline.
    if ((error as { name?: string })?.name === 'TimeoutError') {
      return {
        ok: false,
        error:
          'Open Library did not answer in time. It is sometimes slow: press Search to try again.'
      }
    }
    return { ok: false, error: 'Could not reach Open Library. Check your internet connection.' }
  }

  const docs = (json as { docs?: unknown })?.docs
  const matches: BookMatch[] = []
  for (const raw of Array.isArray(docs) ? docs.slice(0, 8) : []) {
    const d = raw as Record<string, unknown>
    const id = typeof d.key === 'string' ? WORK_KEY.exec(d.key)?.[1] : undefined
    const title = typeof d.title === 'string' && d.title.trim() ? d.title.trim() : undefined
    if (!id || !title) continue
    const authors = Array.isArray(d.author_name)
      ? d.author_name.filter((a): a is string => typeof a === 'string')
      : []
    const year = typeof d.first_publish_year === 'number' ? d.first_publish_year : undefined
    matches.push({
      candidate: {
        id,
        source: 'openlibrary',
        title,
        year,
        subtitle: authors.slice(0, 2).join(', ') || undefined
      },
      proposal: {
        source: 'openlibrary',
        externalId: id,
        year,
        genres: genresFromSubjects(d.subject),
        author: authors[0],
        hasPoster: coverUrl(d.cover_i, 'L') !== null
      },
      thumbUrl: coverUrl(d.cover_i, 'S'),
      posterUrl: coverUrl(d.cover_i, 'L')
    })
  }
  return { ok: true, value: matches }
}
