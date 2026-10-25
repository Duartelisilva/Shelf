// Everything the Library screen decides about the data: which items are
// visible, how they are grouped, how they are colored. Pure functions, no
// React, so it is all covered by tests.

import { itemProblems } from '../../../shared/rules'
import type { MediaItem, MediaType } from '../../../shared/types'
import { MEDIA_TYPES, TYPE_PLURAL } from './vocab'

export type Section = 'library' | MediaType | 'wishlist' | 'favorites'
export type GroupBy = 'franchise' | 'genre' | 'collection' | 'none'

export const SECTION_TITLES: Record<Section, string> = {
  library: 'Library',
  movie: 'Movies',
  series: 'Series',
  book: 'Books',
  wishlist: 'Wishlist',
  favorites: 'Favorites'
}

// A genre only means something inside one type: "Fantasy" for books is not "Fantasy" for movies.
export interface GenreFilter {
  type: MediaType
  name: string
}

export interface Filters {
  section: Section
  query: string
  genre: GenreFilter | null
  favoritesOnly: boolean
  attentionOnly?: boolean // only items with a missing or invalid year or date
}

export interface Shelf {
  id: string
  title: string
  tag?: string // which type it is, shown only when several types are on screen
  items: MediaItem[]
}

// Which items a sidebar entry shows. Movies, Series and Books hold what you
// have seen or are going through; the wishlist has its own entry.
export function sectionItems(items: MediaItem[], section: Section): MediaItem[] {
  switch (section) {
    case 'library':
      return items
    case 'wishlist':
      return items.filter((i) => i.status === 'wishlist')
    case 'favorites':
      return items.filter((i) => i.isFavorite)
    default:
      return items.filter((i) => i.type === section && i.status !== 'wishlist')
  }
}

export function sectionCounts(items: MediaItem[]): Record<Section, number> {
  const sections = Object.keys(SECTION_TITLES) as Section[]
  const counts = {} as Record<Section, number>
  for (const section of sections) counts[section] = sectionItems(items, section).length
  return counts
}

// Lowercase and without accents, so "amelie" finds "Amélie".
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function matchesQuery(item: MediaItem, query: string): boolean {
  const words = normalizeText(query.trim()).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = normalizeText(
    [item.title, item.franchise, item.collection, item.author, item.notes, ...item.genres]
      .filter(Boolean)
      .join(' ')
  )
  return words.every((word) => haystack.includes(word))
}

export function applyFilters(items: MediaItem[], filters: Filters): MediaItem[] {
  return sectionItems(items, filters.section).filter(
    (item) =>
      (!filters.favoritesOnly || item.isFavorite) &&
      (!filters.attentionOnly || itemProblems(item).length > 0) &&
      (!filters.genre ||
        (item.type === filters.genre.type && item.genres.includes(filters.genre.name))) &&
      matchesQuery(item, filters.query)
  )
}

export interface GenreOption extends GenreFilter {
  count: number
}

// Every genre with how many items have it, kept apart by type.
export function genreOptions(items: MediaItem[]): GenreOption[] {
  const options = new Map<string, GenreOption>()
  for (const item of items) {
    for (const name of item.genres) {
      const key = `${item.type}|${name}`
      const option = options.get(key) ?? { type: item.type, name, count: 0 }
      option.count += 1
      options.set(key, option)
    }
  }
  return [...options.values()].sort(
    (a, b) =>
      MEDIA_TYPES.indexOf(a.type) - MEDIA_TYPES.indexOf(b.type) ||
      b.count - a.count ||
      a.name.localeCompare(b.name)
  )
}

export type SortBy = 'title' | 'added' | 'year' | 'seen' | 'rating'

export const SORT_LABELS: Record<SortBy, string> = {
  title: 'Title (A–Z)',
  added: 'Recently added',
  year: 'Year (newest)',
  seen: 'Last seen',
  rating: 'Rating (highest)'
}

const byTitle = (a: MediaItem, b: MediaItem): number => a.title.localeCompare(b.title)

// Order inside a franchise: its own numbering first, then release year.
const byOrder = (a: MediaItem, b: MediaItem): number =>
  (a.franchiseOrder ?? Infinity) - (b.franchiseOrder ?? Infinity) ||
  (a.year ?? 0) - (b.year ?? 0) ||
  byTitle(a, b)

// "Best first" for each sort. Ties fall back to the title, and items missing
// the value (no date, no rating) go last.
export function compareBy(sortBy: SortBy): (a: MediaItem, b: MediaItem) => number {
  switch (sortBy) {
    case 'added':
      return (a, b) => b.createdAt.localeCompare(a.createdAt) || byTitle(a, b)
    case 'year':
      return (a, b) => (b.year ?? 0) - (a.year ?? 0) || byTitle(a, b)
    case 'seen':
      return (a, b) => (lastDate(b) ?? '').localeCompare(lastDate(a) ?? '') || byTitle(a, b)
    case 'rating':
      return (a, b) => (b.rating ?? -1) - (a.rating ?? -1) || byTitle(a, b)
    default:
      return byTitle
  }
}

// Splits items into shelves. An item with several genres appears on each of
// its genre shelves (the totals elsewhere still count it once). Genres,
// franchises and collections never mix between types: a "Fantasy" shelf of
// movies and a "Fantasy" shelf of books are two shelves, tagged with their type
// when more than one type is on screen.
// With the default title sort, franchise shelves keep their own numbering. With
// any other sort, items and shelves are both ordered by it, so the shelf holding
// the newest (or highest rated...) item comes first.
export function groupItems(
  items: MediaItem[],
  groupBy: GroupBy,
  options: { wishlistShelf: boolean; sortBy?: SortBy }
): Shelf[] {
  const sortBy = options.sortBy ?? 'title'
  const custom = sortBy !== 'title'
  const compare = compareBy(sortBy)
  const wishlist = options.wishlistShelf ? items.filter((i) => i.status === 'wishlist') : []
  const rest = options.wishlistShelf ? items.filter((i) => i.status !== 'wishlist') : items
  let shelves: Shelf[] = []

  if (groupBy === 'none') {
    if (rest.length) shelves.push({ id: 'all', title: 'All', items: [...rest].sort(compare) })
  } else {
    const keysOf = (item: MediaItem): string[] =>
      groupBy === 'franchise'
        ? item.franchise
          ? [item.franchise]
          : []
        : groupBy === 'collection'
          ? item.collection
            ? [item.collection]
            : []
          : item.genres
    const empty = { franchise: 'Standalone', collection: 'No collection', genre: 'No genre' }[
      groupBy
    ]
    const inShelf = custom ? compare : groupBy === 'franchise' ? byOrder : byTitle
    const mixed = new Set(rest.map((i) => i.type)).size > 1
    const tagFor = (type: MediaType): string | undefined => (mixed ? TYPE_PLURAL[type] : undefined)
    const rank = (type: MediaType): number => MEDIA_TYPES.indexOf(type)

    const groups = new Map<string, { type: MediaType; name: string; members: MediaItem[] }>()
    const loose = new Map<MediaType, MediaItem[]>()
    for (const item of rest) {
      const keys = keysOf(item)
      if (keys.length === 0) loose.set(item.type, [...(loose.get(item.type) ?? []), item])
      for (const name of keys) {
        const id = `${item.type}|${name}`
        const group = groups.get(id) ?? { type: item.type, name, members: [] }
        group.members.push(item)
        groups.set(id, group)
      }
    }
    const named: Shelf[] = [...groups.values()]
      .sort((a, b) =>
        groupBy === 'genre'
          ? b.members.length - a.members.length ||
            a.name.localeCompare(b.name) ||
            rank(a.type) - rank(b.type)
          : a.name.localeCompare(b.name) || rank(a.type) - rank(b.type)
      )
      .map((g) => ({
        id: `${groupBy}:${g.type}:${g.name}`,
        title: g.name,
        tag: tagFor(g.type),
        items: [...g.members].sort(inShelf)
      }))
    const looseShelves: Shelf[] = MEDIA_TYPES.filter((t) => loose.has(t)).map((t) => ({
      id: `${groupBy}:${t}:none`,
      title: empty,
      tag: tagFor(t),
      items: [...(loose.get(t) ?? [])].sort(custom ? compare : byTitle)
    }))
    shelves = custom
      ? [...named, ...looseShelves].sort((a, b) => compare(a.items[0], b.items[0]))
      : [...named, ...looseShelves]
  }

  if (wishlist.length)
    shelves.push({ id: 'wishlist', title: 'Wishlist', items: [...wishlist].sort(compare) })
  return shelves
}

// Items without their own color get one from this palette. The color is chosen
// from the franchise name when there is one, so a franchise looks consistent.
const PALETTE = [
  '#234a73',
  '#7a2e2e',
  '#1f6554',
  '#8a5a1c',
  '#4a5a22',
  '#5f3a80',
  '#7a2450',
  '#3b4a6b'
]

export function posterColor(item: MediaItem): string {
  if (item.color) return item.color
  const seed = item.franchise ?? item.title
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

// Black or white text, whichever is easier to read on this background.
export function readableOn(hex: string): '#0f1115' | '#ffffff' {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const channel = (c: number): number => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  return luminance > 0.4 ? '#0f1115' : '#ffffff'
}

export function lastDate(item: MediaItem): string | undefined {
  return [...item.dates].sort().pop()
}

// "2026-08-10" becomes "10/08/2026" (no time zone maths, it is just text).
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

// Card images are served by the app itself (see src/main/images.ts).
export const imageUrl = (fileName: string): string =>
  `shelf-image://img/${encodeURIComponent(fileName)}`

// When the item was added, as dd/mm/yyyy in the computer's own time zone.
export function addedDate(item: MediaItem): string {
  const d = new Date(item.createdAt)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}
