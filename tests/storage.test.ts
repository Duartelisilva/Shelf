import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStorage } from '../src/main/storage'
import type { Library } from '../src/shared/types'

let dir: string
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'shelf-'))
})

const library = (titles: string[]): Library => ({
  version: 1,
  items: titles.map((title, i) => ({
    id: `id-${i}`,
    type: 'movie',
    status: 'finished',
    title,
    genres: [],
    dates: [],
    isFavorite: false,
    createdAt: '2026-01-01T00:00:00.000Z'
  }))
})

describe('storage', () => {
  it('starts with an empty library when there is no file', async () => {
    expect((await createStorage(dir).load()).library.items).toEqual([])
  })

  it('saves and loads the same library', async () => {
    const storage = createStorage(dir)
    await storage.save(library(['Alien']))
    expect((await storage.load()).library).toEqual(library(['Alien']))
  })

  it('moves an unreadable file aside instead of overwriting it', async () => {
    await writeFile(join(dir, 'library.json'), '{ not json')
    const result = await createStorage(dir).load()
    expect(result.library.items).toEqual([])
    expect(result.notice).toContain('library.corrupt-')
    const aside = (await readdir(dir)).find((n) => n.startsWith('library.corrupt-'))!
    expect(await readFile(join(dir, aside), 'utf8')).toBe('{ not json')
  })

  it('keeps one backup per day and prunes old ones', async () => {
    let day = 1
    const storage = createStorage(dir, { keepBackups: 2, now: () => new Date(2026, 0, day) })
    for (day = 1; day <= 4; day++) {
      await storage.save(library([`v${day}`]))
      await storage.save(library([`v${day}b`])) // second save the same day: no new backup
    }
    const backups = await readdir(join(dir, 'backups'))
    expect(backups.sort()).toEqual(['library-2026-01-03.json', 'library-2026-01-04.json'])
  })
})
