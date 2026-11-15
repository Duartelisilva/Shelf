// Renaming, merging and removing the names of genres, franchises and collections
// across the library. Genres, franchises and collections belong to one type each,
// so every change is limited to the type you are working on. Pure functions.

import { itemKey } from '../../../shared/identity'
import type { MediaItem, MediaType } from '../../../shared/types'

export type NameKind = 'genre' | 'franchise' | 'collection'
export interface NameUsage {
  name: string
  count: number
}
export type NameResult =
  { ok: true; items: MediaItem[]; changed: number } | { ok: false; error: string }

const clean = (text: string): string => text.trim().replace(/\s+/g, ' ')
const sameText = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase()

function valuesOf(item: MediaItem, kind: NameKind): string[] {
  if (kind === 'genre') return item.genres
  const value = kind === 'franchise' ? item.franchise : item.collection
  return value ? [value] : []
}

// Every name used by items of this type, with how many items use it, most used first.
export function namesOf(items: MediaItem[], type: MediaType, kind: NameKind): NameUsage[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    if (item.type !== type) continue
    for (const name of valuesOf(item, kind)) counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

// The item with `from` replaced by `to` (or removed when `to` is null).
function changeItem(item: MediaItem, kind: NameKind, from: string, to: string | null): MediaItem {
  if (kind === 'genre') {
    const genres: string[] = []
    for (const g of item.genres) {
      const next = g === from ? to : g
      if (next && !genres.some((x) => sameText(x, next))) genres.push(next)
    }
    return { ...item, genres }
  }
  if (kind === 'franchise') {
    const next: MediaItem = { ...item }
    if (to) next.franchise = to
    else {
      delete next.franchise
      delete next.franchiseOrder // a number in a franchise means nothing without it
    }
    return next
  }
  const next: MediaItem = { ...item }
  if (to) next.collection = to
  else delete next.collection
  return next
}

function apply(
  items: MediaItem[],
  type: MediaType,
  kind: NameKind,
  from: string,
  to: string | null
): NameResult {
  const changedIds = new Set<string>()
  const next = items.map((item) => {
    if (item.type !== type || !valuesOf(item, kind).includes(from)) return item
    changedIds.add(item.id)
    return changeItem(item, kind, from, to)
  })
  if (changedIds.size === 0) return { ok: false, error: 'No item uses that name.' }

  // A franchise is part of what makes an item unique, so changing it must not
  // turn two different items into the same one.
  if (kind === 'franchise') {
    const owner = new Map<string, MediaItem>()
    for (const item of next) {
      const key = itemKey(item)
      const other = owner.get(key)
      if (other && (changedIds.has(item.id) || changedIds.has(other.id))) {
        return {
          ok: false,
          error: `That would make "${item.title}" the same as another item (same title, year and franchise).`
        }
      }
      owner.set(key, item)
    }
  }
  return { ok: true, items: next, changed: changedIds.size }
}

// Gives every item of this type that uses `from` the name `to`. When `to` is the
// name of another existing entry (capitals ignored) the two are merged under that
// entry's spelling.
export function renameName(
  items: MediaItem[],
  type: MediaType,
  kind: NameKind,
  from: string,
  to: string
): NameResult {
  const target = clean(to)
  if (!target) return { ok: false, error: 'Type the new name.' }
  if (target === from) return { ok: false, error: 'That is already the name.' }
  const existing = namesOf(items, type, kind).find(
    (u) => u.name !== from && sameText(u.name, target)
  )
  return apply(items, type, kind, from, existing ? existing.name : target)
}

export function removeName(
  items: MediaItem[],
  type: MediaType,
  kind: NameKind,
  name: string
): NameResult {
  return apply(items, type, kind, name, null)
}
