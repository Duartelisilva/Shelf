import { describe, expect, it } from 'vitest'
import {
  bulkGenre, cleanGenre, createItem, distinct, isDuplicate, removeItem, todayISO,
  withDate, withGenre, withStatus, withoutDate, withoutGenre
} from '../src/renderer/src/lib/edit'
import type { MediaItem } from '../src/shared/types'

const item = (over: Partial<MediaItem> & { id: string }): MediaItem => ({
  type: 'movie', status: 'finished', title: over.id, genres: [], dates: [], isFavorite: false,
  createdAt: '2026-01-01T00:00:00.000Z', ...over
})

describe('creating items', () => {
  it('creates a seen item with an optional date, and a wishlist item without one', () => {
    const seen = createItem({ type: 'movie', title: '  Heat ', year: 1995, status: 'finished', date: '2020-05-01' }, 'a', 'now')
    expect(seen).toMatchObject({ title: 'Heat', year: 1995, status: 'finished', dates: ['2020-05-01'] })
    expect(createItem({ type: 'book', title: 'Dune', year: 1965, status: 'finished' }, 'b', 'now').dates).toEqual([])
    expect(createItem({ type: 'book', title: 'Dune', year: 1965, status: 'wishlist', date: '2020-01-01' }, 'c', 'now').dates).toEqual([])
  })

  it('spots duplicates by type, title and year, ignoring case and extra spaces', () => {
    const items = [item({ id: 'x', title: 'Heat', year: 1995 })]
    expect(isDuplicate(items, { type: 'movie', title: ' heat ', year: 1995 })).toBe(true)
    expect(isDuplicate(items, { type: 'movie', title: 'Heat', year: 2020 })).toBe(false)
    expect(isDuplicate(items, { type: 'series', title: 'Heat', year: 1995 })).toBe(false)
  })
})

describe('status and dates', () => {
  it('gives a wishlist item today as its date when it becomes seen', () => {
    const done = withStatus(item({ id: 'w', status: 'wishlist' }), 'finished', '2026-10-24')
    expect(done).toMatchObject({ status: 'finished', dates: ['2026-10-24'] })
  })

  it('keeps existing dates, and does not add a date when going back to the wishlist', () => {
    const dated = item({ id: 'd', dates: ['2020-01-01'] })
    expect(withStatus(dated, 'finished', '2026-10-24').dates).toEqual(['2020-01-01'])
    expect(withStatus(dated, 'wishlist', '2026-10-24').dates).toEqual(['2020-01-01'])
  })

  it('adds dates once, in order, and removes them', () => {
    let i = item({ id: 'x' })
    i = withDate(withDate(withDate(i, '2024-01-01'), '2020-01-01'), '2024-01-01')
    expect(i.dates).toEqual(['2020-01-01', '2024-01-01'])
    expect(withoutDate(i, '2020-01-01').dates).toEqual(['2024-01-01'])
  })

  it('formats today in the local time zone', () => {
    expect(todayISO(new Date(2026, 9, 4))).toBe('2026-10-04')
  })
})

describe('genres', () => {
  it('reuses the spelling of an existing genre and ignores duplicates', () => {
    expect(cleanGenre(' horror ', ['Horror'])).toBe('Horror')
    const i = withGenre(withGenre(item({ id: 'x' }), 'horror', ['Horror']), 'HORROR', ['Horror'])
    expect(i.genres).toEqual(['Horror'])
    expect(withoutGenre(i, 'horror').genres).toEqual([])
  })

  it('adds and removes a genre on only the selected items', () => {
    const items = [item({ id: 'a' }), item({ id: 'b', genres: ['Horror'] }), item({ id: 'c' })]
    const added = bulkGenre(items, new Set(['a', 'b']), 'Horror', 'add')
    expect(added.map((i) => i.genres)).toEqual([['Horror'], ['Horror'], []])
    expect(added[2]).toBe(items[2]) // untouched items are the same objects
    const removed = bulkGenre(added, new Set(['a']), 'Horror', 'remove')
    expect(removed.map((i) => i.genres)).toEqual([[], ['Horror'], []])
  })
})

describe('lists', () => {
  it('removes an item without changing the original list', () => {
    const items = [item({ id: 'a' }), item({ id: 'b' })]
    expect(removeItem(items, 'a').map((i) => i.id)).toEqual(['b'])
    expect(items).toHaveLength(2)
  })

  it('lists distinct sorted values', () => {
    expect(distinct(['b', undefined, 'a', 'b'])).toEqual(['a', 'b'])
  })
})
