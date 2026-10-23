// Converts the JSON files written by MediaTracker V1 into Shelf items.
// Pure functions only (no Electron, no file access), so they are easy to test.
// Reading the files and showing the preview happens elsewhere.

import type { Library, MediaItem, MediaType } from './types'

// V1 saved these files next to the exe. Its repository named them after the
// C# class plus an "s", which is why two names look odd.
export const V1_FILE_NAMES = {
  movies: 'movies.json',
  series: 'seriess.json',
  books: 'bookss.json',
  wishlist: 'wishlists.json'
} as const

export interface V1Files {
  movies?: unknown
  series?: unknown
  books?: unknown
  wishlist?: unknown
}

export interface ImportResult {
  items: MediaItem[]
  warnings: string[]
  genreCounts: Record<string, number> // what V1 "Saga" values became, for the preview
}

export interface ImportOptions {
  now?: string
  newId?: () => string
}

type Raw = Record<string, unknown>

// Parses the text of a V1 file. Tolerates a leading byte-order mark.
export function parseV1Json(text: string): unknown {
  return JSON.parse(text.replace(/^\uFEFF/, ''))
}

export function importV1(files: V1Files, options: ImportOptions = {}): ImportResult {
  const now = options.now ?? new Date().toISOString()
  const newId = options.newId ?? ((): string => globalThis.crypto.randomUUID())
  const warnings: string[] = []
  const items: MediaItem[] = []
  const seen = new Set<string>()

  const add = (item: MediaItem, source: string): void => {
    const key = duplicateKey(item)
    if (seen.has(key)) {
      warnings.push(`${source}: skipped duplicate "${item.title}"`)
      return
    }
    seen.add(key)
    items.push(item)
  }

  for (const [list, type, source] of [
    [files.movies, 'movie', 'movies'],
    [files.series, 'series', 'series'],
    [files.books, 'book', 'books']
  ] as const) {
    for (const raw of asRecords(list, source, warnings)) {
      const item = convert(raw, type, null, now, newId(), source, warnings)
      if (item) add(item, source)
    }
  }

  for (const raw of asRecords(files.wishlist, 'wishlist', warnings)) {
    const type = wishlistType(raw)
    if (!type) {
      warnings.push(`wishlist: unknown type for "${text(raw, 'Title') ?? '?'}", skipped`)
      continue
    }
    const item = convert(raw, type, 'wishlist', now, newId(), 'wishlist', warnings)
    if (item) add(item, 'wishlist')
  }

  const genreCounts: Record<string, number> = {}
  for (const item of items) {
    for (const genre of item.genres) genreCounts[genre] = (genreCounts[genre] ?? 0) + 1
  }
  return { items, warnings, genreCounts }
}

// Adds imported items to an existing library, skipping ones already there,
// so running the import twice does not duplicate anything.
export function mergeIntoLibrary(
  library: Library,
  imported: MediaItem[]
): { library: Library; added: number; skipped: number } {
  const known = new Set(library.items.map(duplicateKey))
  const fresh = imported.filter((item) => !known.has(duplicateKey(item)))
  return {
    library: { ...library, items: [...library.items, ...fresh] },
    added: fresh.length,
    skipped: imported.length - fresh.length
  }
}

function convert(
  raw: Raw,
  type: MediaType,
  forcedStatus: 'wishlist' | null,
  now: string,
  id: string,
  source: string,
  warnings: string[]
): MediaItem | null {
  const title = normalize(text(raw, 'Title'))
  if (!title) {
    warnings.push(`${source}: skipped an entry with no title`)
    return null
  }

  const dates = watchDates(raw, title, warnings)
  const saga = normalize(text(raw, 'Saga'))
  const year = num(raw, 'Year')
  const item: MediaItem = {
    id,
    type,
    // V1 library items were all things already seen or read, with or without
    // a recorded date (something seen years ago may have no date at all).
    status: forcedStatus ?? 'finished',
    title,
    genres: saga ? [saga] : [],
    dates,
    isFavorite: get(raw, 'IsFavorite') === true,
    createdAt: now
  }
  if (year && year > 0) item.year = year
  const notes = normalize(text(raw, 'Note'))
  if (notes) item.notes = notes
  const color = hexColor(get(raw, 'BaseColor'))
  if (color) item.color = color

  if (type === 'movie') {
    const franchise = normalize(text(raw, 'Franchise'))
    if (franchise) item.franchise = franchise
    const order = num(raw, 'FranchiseNumber')
    if (order) item.franchiseOrder = order
  } else if (type === 'series') {
    const yearEnd = num(raw, 'YearEnd')
    if (yearEnd) item.yearEnd = yearEnd
    // Library series store NumberOfSeasons; wishlist series store SeasonNumber.
    const seasons = num(raw, 'NumberOfSeasons') ?? num(raw, 'SeasonNumber')
    if (seasons) item.seasons = seasons
  } else {
    const author = normalize(text(raw, 'Author'))
    if (author) item.author = author
    const order = num(raw, 'BookNumber')
    if (order) item.franchiseOrder = order
  }
  return item
}

function wishlistType(raw: Raw): MediaType | null {
  const value = get(raw, 'Type')
  if (value === 0 || value === 'Movie') return 'movie'
  if (value === 1 || value === 'Series') return 'series'
  if (value === 2 || value === 'Books' || value === 'Book') return 'book'
  return null
}

function watchDates(raw: Raw, title: string, warnings: string[]): string[] {
  const list = get(raw, 'WatchDates')
  if (!Array.isArray(list)) return []
  const out = new Set<string>()
  for (const entry of list) {
    const match = typeof entry === 'string' ? /^(\d{4}-\d{2}-\d{2})/.exec(entry) : null
    if (match) out.add(match[1])
    else warnings.push(`"${title}": could not read a watch date, ignored`)
  }
  return [...out].sort()
}

// V1 stored a WPF Color as {"A":..,"R":..,"G":..,"B":..}. Transparent means "no color".
function hexColor(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined
  const c = value as Raw
  const [a, r, g, b] = [c.A, c.R, c.G, c.B]
  if (![a, r, g, b].every((n) => typeof n === 'number')) return undefined
  if (a === 0) return undefined
  const hex = (n: unknown): string => (n as number).toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

function asRecords(value: unknown, source: string, warnings: string[]): Raw[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) {
    warnings.push(`${source}: expected a list, file ignored`)
    return []
  }
  return value.filter((v): v is Raw => !!v && typeof v === 'object' && !Array.isArray(v))
}

// V1 used PascalCase names. Fall back to a case-insensitive match just in case.
function get(raw: Raw, key: string): unknown {
  if (key in raw) return raw[key]
  const lower = key.toLowerCase()
  const found = Object.keys(raw).find((k) => k.toLowerCase() === lower)
  return found === undefined ? undefined : raw[found]
}

function text(raw: Raw, key: string): string | undefined {
  const v = get(raw, key)
  return typeof v === 'string' ? v : undefined
}

function num(raw: Raw, key: string): number | undefined {
  const v = get(raw, key)
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

function normalize(value: string | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ')
}

function duplicateKey(item: MediaItem): string {
  return `${item.type}|${item.title.toLowerCase()}|${item.year ?? ''}`
}
