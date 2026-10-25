// All the ways an item can be changed. Each function returns a new item (or
// list) and never modifies its input, which is what makes undo possible: the
// app just keeps the previous list.

import type { MediaItem, MediaType, Status } from '../../../shared/types'
import type { Section } from './library'

// Today as yyyy-mm-dd in the computer's own time zone.
export function todayISO(date: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const clean = (text: string): string => text.trim().replace(/\s+/g, ' ')

// Reuses the spelling of a genre that already exists ("horror" becomes "Horror").
export function cleanGenre(input: string, known: string[] = []): string {
  const text = clean(input)
  return known.find((k) => k.toLowerCase() === text.toLowerCase()) ?? text
}

export function isDuplicate(
  items: MediaItem[],
  candidate: { type: MediaType; title: string; year?: number }
): boolean {
  const key = (type: string, title: string, year?: number): string =>
    `${type}|${clean(title).toLowerCase()}|${year ?? ''}`
  const wanted = key(candidate.type, candidate.title, candidate.year)
  return items.some((i) => key(i.type, i.title, i.year) === wanted)
}

// What the Add dialog starts with: a movie you have seen, dated today. The date
// can be removed when it was really long ago, and the status switched to wishlist.
export function blankItem(id: string, now: string, today: string): MediaItem {
  return {
    id,
    type: 'movie',
    status: 'finished',
    title: '',
    genres: [],
    dates: [today],
    isFavorite: false,
    createdAt: now
  }
}

// Adding from the Series tab starts a series, from Books a book, from Wishlist a
// wishlist item, from Favorites a favorite. Anywhere else it starts as a movie.
export function startingItem(section: Section, id: string, now: string, today: string): MediaItem {
  const base = blankItem(id, now, today)
  switch (section) {
    case 'series':
    case 'book':
      return withType(base, section)
    case 'wishlist':
      return { ...base, status: 'wishlist', dates: [] }
    case 'favorites':
      return { ...base, isFavorite: true }
    default:
      return base
  }
}

// Changing the type drops the fields that only make sense for another type.
export function withType(item: MediaItem, type: MediaType): MediaItem {
  const next: MediaItem = { ...item, type }
  if (type !== 'series') {
    delete next.yearEnd
    delete next.seasons
  }
  if (type === 'series') {
    delete next.franchise
    delete next.franchiseOrder
  }
  if (type !== 'book') delete next.author
  return next
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
