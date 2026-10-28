// The poster and details lookup: searches, details and poster download. The
// window never gives this code an address to fetch: it only names a type, a
// search text and an id, and every address is built here from fixed hosts.
// Part of the removable metadata folder (see docs/METADATA.md).

import type { ImagePick, LookupCandidate, LookupDetails, LookupProposal, LookupSearch, LookupSource } from '../../shared/api'
import type { MediaType } from '../../shared/types'
import { MAX_IMAGE_BYTES } from '../imageStore'
import type { ImageStore } from '../imageStore'
import { OPEN_LIBRARY_USER_AGENT, searchOpenLibrary } from './openlibrary'
import { getTmdbDetails, searchTmdb } from './tmdb'

const ALLOWED_IMAGE_HOSTS = ['image.tmdb.org', 'covers.openlibrary.org']
const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const MAX_REMEMBERED = 200

interface Deps {
  getTmdbKey: () => Promise<string | null>
  images: ImageStore
  fetchFn?: typeof fetch
}

export interface Lookup {
  search(type: MediaType, query: string): Promise<LookupSearch>
  details(type: MediaType, source: LookupSource, id: string): Promise<LookupDetails>
  downloadPoster(itemId: string, source: LookupSource, id: string): Promise<Exclude<ImagePick, null>>
}

export function createLookup({ getTmdbKey, images, fetchFn = fetch }: Deps): Lookup {
  // What the last searches and details found, so a poster can be fetched later
  // without the window naming an address.
  const posterUrls = new Map<string, string>()
  const books = new Map<string, LookupProposal>()
  const remember = <T>(map: Map<string, T>, key: string, value: T): void => {
    if (map.size >= MAX_REMEMBERED) map.delete(map.keys().next().value as string)
    map.set(key, value)
  }

  async function fetchImage(url: string): Promise<{ bytes: Buffer; mime: string }> {
    if (!ALLOWED_IMAGE_HOSTS.includes(new URL(url).hostname)) throw new Error('Unexpected image address.')
    const response = await fetchFn(url, {
      headers: { 'User-Agent': OPEN_LIBRARY_USER_AGENT },
      signal: AbortSignal.timeout(15_000)
    })
    if (!response.ok) throw new Error(`The image server answered with an error (${response.status}).`)
    const mime = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    if (!(mime in EXTENSIONS)) throw new Error('The server did not send a usable image.')
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.length > MAX_IMAGE_BYTES) throw new Error('That image is larger than 15 MB.')
    return { bytes, mime }
  }

  async function withThumbs(items: { candidate: LookupCandidate; thumbUrl: string | null }[]): Promise<LookupCandidate[]> {
    return Promise.all(
      items.map(async ({ candidate, thumbUrl }) => {
        if (!thumbUrl) return candidate
        try {
          const { bytes, mime } = await fetchImage(thumbUrl)
          return { ...candidate, thumb: `data:${mime};base64,${bytes.toString('base64')}` }
        } catch {
          return candidate // a missing thumbnail is not worth failing the search for
        }
      })
    )
  }

  return {
    async search(type, query) {
      const text = query.trim().slice(0, 200)
      if (!text) return { ok: true, candidates: [] }

      if (type === 'book') {
        const result = await searchOpenLibrary(text, fetchFn)
        if (!result.ok) return result
        for (const m of result.value) {
          remember(books, m.candidate.id, m.proposal)
          if (m.posterUrl) remember(posterUrls, `openlibrary:${m.candidate.id}`, m.posterUrl)
        }
        return { ok: true, candidates: await withThumbs(result.value) }
      }

      const key = await getTmdbKey()
      if (!key) return { ok: false, error: 'Add your TMDB key in Settings (Posters and details) to look up movies and series.' }
      const result = await searchTmdb(key, type === 'movie' ? 'movie' : 'tv', text, fetchFn)
      if (!result.ok) return result
      return { ok: true, candidates: await withThumbs(result.value) }
    },

    async details(type, source, id) {
      if (source === 'openlibrary') {
        const proposal = books.get(id)
        return proposal ? { ok: true, proposal } : { ok: false, error: 'Search again to see this book.' }
      }
      const key = await getTmdbKey()
      if (!key) return { ok: false, error: 'Add your TMDB key in Settings first.' }
      const result = await getTmdbDetails(key, type === 'movie' ? 'movie' : 'tv', id, fetchFn)
      if (!result.ok) return result
      const d = result.value
      if (d.posterUrl) remember(posterUrls, `tmdb:${id}`, d.posterUrl)
      return {
        ok: true,
        proposal: {
          source: 'tmdb',
          externalId: id,
          year: d.year,
          yearEnd: d.yearEnd,
          seasons: d.seasons,
          genres: d.genres,
          franchise: d.franchise,
          overview: d.overview,
          hasPoster: d.posterUrl !== null
        }
      }
    },

    async downloadPoster(itemId, source, id) {
      const url = posterUrls.get(`${source}:${id}`)
      if (!url) return { error: 'Look the item up again to get its poster.' }
      try {
        const { bytes, mime } = await fetchImage(url)
        return { fileName: await images.importBytes(bytes, EXTENSIONS[mime], itemId) }
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'The poster could not be saved.' }
      }
    }
  }
}
