import { describe, expect, it } from 'vitest'
import { changesBetween } from '../src/main/itemDiff'
import type { MediaItem } from '../src/shared/types'

const base: MediaItem = {
  id: 'a', type: 'movie', status: 'finished', title: 'Alien', year: 1979, genres: ['Horror', 'Sci-Fi'],
  dates: ['2026-01-01'], isFavorite: false, createdAt: '2026-01-01T00:00:00.000Z'
}

describe('changesBetween', () => {
  it('finds nothing when the items are the same, ignoring list order, empty values and creation time', () => {
    expect(changesBetween(base, { ...base })).toEqual([])
    expect(changesBetween(base, { ...base, genres: ['Sci-Fi', 'Horror'] })).toEqual([])
    expect(changesBetween(base, { ...base, notes: '', createdAt: '2027-01-01T00:00:00.000Z' })).toEqual([])
  })

  it('describes a status change from your version to the file\'s', () => {
    const mine = { ...base, status: 'wishlist' as const, dates: [] }
    expect(changesBetween(mine, base)).toEqual(['status (wishlist → seen or read)', 'dates'])
  })

  it('lists the fields that differ, by their everyday names', () => {
    const changed = { ...base, rating: 9, isFavorite: true, franchiseOrder: 1, genres: ['Horror'] }
    expect(changesBetween(base, changed).sort()).toEqual(['favorite', 'genres', 'number', 'rating'])
  })
})
