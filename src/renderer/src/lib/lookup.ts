// Turns what a lookup found into a list of proposed changes the user can tick,
// and applies the ticked ones. Pure functions; part of the removable lookup
// feature (see docs/METADATA.md).
//
// Nothing here changes an item by itself. By default only gaps are ticked (a
// missing image, year or genres); anything that would replace something you
// entered, and franchise suggestions, start unticked.

import type { LookupProposal } from '../../../shared/api'
import { isValidYear } from '../../../shared/rules'
import type { MediaItem } from '../../../shared/types'
import { withGenre } from './edit'

export type ReviewField = 'poster' | 'year' | 'yearEnd' | 'seasons' | 'genre' | 'franchise' | 'author'

export interface ReviewRow {
  id: string
  field: ReviewField
  label: string
  current: string
  proposed: string
  value?: string | number
  checked: boolean
}

// TMDB names some genres differently from the way people write them, and joins
// two genres into one for series.
const SPLIT: Record<string, string[]> = {
  'action & adventure': ['Action', 'Adventure'],
  'sci-fi & fantasy': ['Sci-Fi', 'Fantasy'],
  'war & politics': ['War', 'Politics']
}
const SAME_AS: Record<string, string[]> = { 'science fiction': ['Sci-Fi', 'Science Fiction'] }

// Suggested genres, spelled the way your own genres are spelled when one matches
// ("Science Fiction" becomes "Sci-Fi" if that is what you use).
export function matchGenres(suggested: string[], known: string[]): string[] {
  const mine = new Map(known.map((k) => [k.toLowerCase(), k]))
  const out: string[] = []
  for (const raw of suggested) {
    for (const name of SPLIT[raw.toLowerCase()] ?? [raw]) {
      const options = SAME_AS[name.toLowerCase()] ?? [name]
      const existing = options.find((o) => mine.has(o.toLowerCase()))
      const spelled = existing ? (mine.get(existing.toLowerCase()) as string) : options[0]
      if (!out.some((o) => o.toLowerCase() === spelled.toLowerCase())) out.push(spelled)
    }
  }
  return out
}

export function buildReview(item: MediaItem, proposal: LookupProposal, knownGenres: string[]): ReviewRow[] {
  const rows: ReviewRow[] = []

  if (proposal.hasPoster) {
    rows.push({
      id: 'poster',
      field: 'poster',
      label: 'Poster',
      current: item.image ? 'your current image' : 'no image',
      proposed: proposal.source === 'tmdb' ? 'the TMDB poster' : 'the Open Library cover',
      checked: !item.image
    })
  }
  if (proposal.year !== undefined && isValidYear(proposal.year) && proposal.year !== item.year) {
    rows.push({
      id: 'year',
      field: 'year',
      label: 'Year',
      current: item.year === undefined ? 'none' : String(item.year),
      proposed: String(proposal.year),
      value: proposal.year,
      checked: item.year === undefined
    })
  }
  if (item.type === 'series') {
    const end = proposal.yearEnd
    if (end !== undefined && isValidYear(end) && end !== item.yearEnd && (item.year === undefined || end >= item.year)) {
      rows.push({ id: 'yearEnd', field: 'yearEnd', label: 'Ended', current: item.yearEnd === undefined ? 'none' : String(item.yearEnd), proposed: String(end), value: end, checked: item.yearEnd === undefined })
    }
    if (proposal.seasons !== undefined && proposal.seasons !== item.seasons) {
      rows.push({ id: 'seasons', field: 'seasons', label: 'Seasons', current: item.seasons === undefined ? 'none' : String(item.seasons), proposed: String(proposal.seasons), value: proposal.seasons, checked: item.seasons === undefined })
    }
  }
  for (const genre of matchGenres(proposal.genres, knownGenres)) {
    if (item.genres.some((g) => g.toLowerCase() === genre.toLowerCase())) continue
    rows.push({ id: `genre:${genre}`, field: 'genre', label: 'Genre', current: 'add', proposed: genre, value: genre, checked: item.genres.length === 0 })
  }
  if (item.type === 'movie' && proposal.franchise && !item.franchise) {
    rows.push({ id: 'franchise', field: 'franchise', label: 'Franchise', current: 'none', proposed: proposal.franchise, value: proposal.franchise, checked: false })
  }
  if (item.type === 'book' && proposal.author && proposal.author !== item.author) {
    rows.push({ id: 'author', field: 'author', label: 'Author', current: item.author ?? 'none', proposed: proposal.author, value: proposal.author, checked: !item.author })
  }
  return rows
}

// Applies the ticked rows (the poster is saved separately, because it has to be
// downloaded) and records where the details came from.
export function applyReview(item: MediaItem, picked: ReviewRow[], proposal: LookupProposal, now: string): MediaItem {
  let next: MediaItem = { ...item }
  for (const row of picked) {
    switch (row.field) {
      case 'year':
        next.year = Number(row.value)
        break
      case 'yearEnd':
        next.yearEnd = Number(row.value)
        break
      case 'seasons':
        next.seasons = Number(row.value)
        break
      case 'genre':
        next = withGenre(next, String(row.value))
        break
      case 'franchise':
        next.franchise = String(row.value)
        break
      case 'author':
        next.author = String(row.value)
        break
      case 'poster':
        break // downloaded and stored by the dialog
    }
  }
  next.meta = { source: proposal.source, externalId: proposal.externalId, overview: proposal.overview, approvedAt: now }
  return next
}
