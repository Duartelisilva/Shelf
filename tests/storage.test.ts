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

describe('storage safety', () => {
  it('keeps the order of many saves made at once, without errors', async () => {
    const storage = createStorage(dir)
    const saves = Array.from({ length: 25 }, (_, i) => storage.save(library([`v${i}`])))
    await Promise.all(saves)
    expect((await storage.load()).library).toEqual(library(['v24']))
    expect((await readdir(dir)).filter((n) => n.endsWith('.tmp'))).toEqual([])
  })

  it('refuses to save something that is not a library, and keeps the old file', async () => {
    const storage = createStorage(dir)
    await storage.save(library(['Alien']))
    await expect(storage.save({ version: 1, items: [{ nonsense: true }] } as never)).rejects.toThrow('expected shape')
    await expect(storage.save(null as never)).rejects.toThrow('expected shape')
    expect((await storage.load()).library).toEqual(library(['Alien']))
  })

  it('keeps saving after one save was refused', async () => {
    const storage = createStorage(dir)
    await expect(storage.save(null as never)).rejects.toThrow()
    await storage.save(library(['Heat']))
    expect((await storage.load()).library).toEqual(library(['Heat']))
  })
})

describe('storage snapshots', () => {
  it('has nothing to keep before the first save, then keeps a copy of the current library', async () => {
    const storage = createStorage(dir)
    expect(await storage.snapshot('restore')).toBeNull()
    await storage.save(library(['Alien']))
    const name = await storage.snapshot('restore')
    expect(name).toContain('before-restore-')
    expect(JSON.parse(await readFile(join(dir, 'backups', name!), 'utf8'))).toEqual(library(['Alien']))
  })

  it('keeps only the newest 5 safety copies per reason', async () => {
    let tick = 0
    const storage = createStorage(dir, { now: () => new Date(2026, 0, 1, 0, 0, ++tick) })
    await storage.save(library(['Alien']))
    for (let i = 0; i < 7; i++) await storage.snapshot('import')
    const copies = (await readdir(join(dir, 'backups'))).filter((n) => n.startsWith('before-import-'))
    expect(copies).toHaveLength(5)
  })

  it('flush waits for the saves already requested', async () => {
    const storage = createStorage(dir)
    void storage.save(library(['A']))
    void storage.save(library(['B']))
    await storage.flush()
    expect((await storage.load()).library).toEqual(library(['B']))
  })
})
