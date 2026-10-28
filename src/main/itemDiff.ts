// Describes how two versions of the same item differ, in words a person can
// read. Used by the import preview: "your version -> the file's version".

import type { MediaItem } from '../shared/types'

const FIELDS: { key: keyof MediaItem; label: string }[] = [
  { key: 'type', label: 'type' },
  { key: 'title', label: 'title' },
  { key: 'year', label: 'year' },
  { key: 'status', label: 'status' },
  { key: 'rating', label: 'rating' },
  { key: 'isFavorite', label: 'favorite' },
  { key: 'genres', label: 'genres' },
  { key: 'franchise', label: 'franchise' },
  { key: 'franchiseOrder', label: 'number' },
  { key: 'collection', label: 'collection' },
  { key: 'dates', label: 'dates' },
  { key: 'notes', label: 'notes' },
  { key: 'image', label: 'image' },
  { key: 'progress', label: 'progress' },
  { key: 'seasons', label: 'seasons' },
  { key: 'yearEnd', label: 'end year' },
  { key: 'author', label: 'author' },
  { key: 'color', label: 'color' }
]

const STATUS_TEXT: Record<MediaItem['status'], string> = {
  wishlist: 'wishlist',
  'in-progress': 'in progress',
  finished: 'seen or read'
}

// Missing and empty count as the same, and lists are compared without order.
function normalize(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify([...value].sort())
  if (value === undefined || value === null || value === '') return 'null'
  return JSON.stringify(value)
}

// The fields that differ, for example ["status (wishlist -> seen or read)", "rating"].
// Empty when the two versions are the same.
export function changesBetween(current: MediaItem, incoming: MediaItem): string[] {
  const changes: string[] = []
  for (const { key, label } of FIELDS) {
    if (normalize(current[key]) === normalize(incoming[key])) continue
    changes.push(
      key === 'status'
        ? `status (${STATUS_TEXT[current.status]} → ${STATUS_TEXT[incoming.status]})`
        : label
    )
  }
  return changes
}
