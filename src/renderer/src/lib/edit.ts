// All the ways an item can be changed. Each function returns a new item (or
// list) and never modifies its input, which is what makes undo possible: the
// app just keeps the previous list.

import type { MediaItem, MediaType, Status } from '../../../shared/types'

// Today as yyyy-mm-dd in the computer's own time zone.
export function todayISO(date: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export interface Draft {
  type: MediaType
  title: string
  year: number
  status: 'wishlist' | 'finished'
  date?: string // when it was seen; optional, an old favorite may have no date
}

const clean = (text: string): string => text.trim().replace(/\s+/g, ' ')

// Reuses the spelling of a genre that already exists ("horror" becomes "Horror").
export function cleanGenre(input: string, known: string[] = []): string {
  const text = clean(input)
  return known.find((k) => k.toLowerCase() === text.toLowerCase()) ?? text
}

export function isDuplicate(items: MediaItem[], draft: Pick<Draft, 'type' | 'title' | 'year'>): boolean {
  const key = (type: string, title: string, year?: number): string =>
    `${type}|${clean(title).toLowerCase()}|${year ?? ''}`
  const wanted = key(draft.type, draft.title, draft.year)
  return items.some((i) => key(i.type, i.title, i.year) === wanted)
}

export function createItem(draft: Draft, id: string, now: string): MediaItem {
  const item: MediaItem = {
    id,
    type: draft.type,
    status: draft.status,
    title: clean(draft.title),
    year: draft.year,
    genres: [],
    dates: draft.status === 'finished' && draft.date ? [draft.date] : [],
    isFavorite: false,
    createdAt: now
  }
  return item
}

export const replaceItem = (items: MediaItem[], updated: MediaItem): MediaItem[] =>
  items.map((i) => (i.id === updated.id ? updated : i))

export const removeItem = (items: MediaItem[], id: string): MediaItem[] =>
  items.filter((i) => i.id !== id)

// Marking something as seen or read gives it today's date if it had none.
// The date can be removed afterwards when it was really a long time ago.
export function withStatus(item: MediaItem, status: Status, today: string): MediaItem {
  const becameFinished = status === 'finished' && item.status !== 'finished'
  const dates = becameFinished && item.dates.length === 0 ? [today] : item.dates
  return { ...item, status, dates }
}

export const withDate = (item: MediaItem, iso: string): MediaItem =>
  item.dates.includes(iso) || !iso ? item : { ...item, dates: [...item.dates, iso].sort() }

export const withoutDate = (item: MediaItem, iso: string): MediaItem => ({
  ...item,
  dates: item.dates.filter((d) => d !== iso)
})

export function withGenre(item: MediaItem, genre: string, known: string[] = []): MediaItem {
  const name = cleanGenre(genre, known)
  if (!name || item.genres.some((g) => g.toLowerCase() === name.toLowerCase())) return item
  return { ...item, genres: [...item.genres, name] }
}

export const withoutGenre = (item: MediaItem, genre: string): MediaItem => ({
  ...item,
  genres: item.genres.filter((g) => g.toLowerCase() !== genre.toLowerCase())
})

// Adds or removes one genre on many items at once.
export function bulkGenre(
  items: MediaItem[],
  ids: ReadonlySet<string>,
  genre: string,
  mode: 'add' | 'remove',
  known: string[] = []
): MediaItem[] {
  return items.map((item) => {
    if (!ids.has(item.id)) return item
    return mode === 'add' ? withGenre(item, genre, known) : withoutGenre(item, genre)
  })
}

export function distinct(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b))
}
