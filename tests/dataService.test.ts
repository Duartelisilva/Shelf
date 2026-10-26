import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createDataService } from '../src/main/dataService'
import { createImageStore } from '../src/main/imageStore'
import { createStorage } from '../src/main/storage'
import type { Library, MediaItem } from '../src/shared/types'

const ID = '123e4567-e89b-12d3-a456-426614174000'
const item = (over: Partial<MediaItem> & { id: string; title: string }): MediaItem => ({
  type: 'movie', status: 'finished', genres: [], dates: [], isFavorite: false,
  createdAt: '2026-01-01T00:00:00.000Z', ...over
})

// A complete, separate "computer": its own storage, images and backups.
async function setup(): Promise<{
  dir: string
  storage: ReturnType<typeof createStorage>
  images: ReturnType<typeof createImageStore>
  service: ReturnType<typeof createDataService>
}> {
  const dir = await mkdtemp(join(tmpdir(), 'shelf-data-'))
  let tick = 0
  const now = (): Date => new Date(2026, 9, 26, 12, 0, ++tick)
  const storage = createStorage(dir, { now })
  const images = createImageStore(join(dir, 'images'))
  const service = createDataService({ storage, images, backupsDir: join(dir, 'backups'), appVersion: '2.0.0', now })
  return { dir, storage, images, service }
}

describe('export and import', () => {
  it('moves a library with its images to another computer, in both modes', async () => {
    const a = await setup()
    const source = join(a.dir, 'poster.png')
    await writeFile(source, 'poster bytes')
    const image = await a.images.importFile(source, ID)
    const library: Library = { version: 1, items: [item({ id: 'a', title: 'Alien', year: 1979, image }), item({ id: 'b', title: 'Heat', year: 1995 })] }
    await a.storage.save(library)

    const file = join(a.dir, 'backup.shelf')
    expect(await a.service.exportTo(file)).toMatchObject({ items: 2, images: 1 })

    // another computer
    const b = await setup()
    const pending = await b.service.inspect(file)
    expect(pending.preview).toMatchObject({ file: 'backup.shelf', newItems: 2, alreadyHere: 0, images: 1, counts: { movies: 2 } })
    const added = await pending.commit('add')
    expect(added).toMatchObject({ added: 2, skipped: 0 })
    expect((await b.images.read(image))?.toString()).toBe('poster bytes')

    // importing the same file again adds nothing
    const again = await b.service.inspect(file)
    expect(again.preview).toMatchObject({ newItems: 0, alreadyHere: 2 })
    expect(await again.commit('add')).toMatchObject({ added: 0, skipped: 2 })

    // replace: the library becomes exactly the file, and the old one is kept as a safety copy
    await b.storage.save({ version: 1, items: [...(await b.storage.load()).library.items, item({ id: 'x', title: 'Extra', year: 2000 })] })
    const replace = await (await b.service.inspect(file)).commit('replace')
    expect(replace.library.items.map((i) => i.title)).toEqual(['Alien', 'Heat'])
    const backups = await b.service.listBackups()
    expect(backups.filter((x) => x.kind === 'import')).toHaveLength(1)
    expect(backups.find((x) => x.kind === 'import')?.items).toBe(3)
  })

  it('refuses a file that is not an export, without touching the library', async () => {
    const a = await setup()
    await a.storage.save({ version: 1, items: [item({ id: 'a', title: 'Alien', year: 1979 })] })
    const bad = join(a.dir, 'bad.shelf')
    await writeFile(bad, 'not a zip')
    await expect(a.service.inspect(bad)).rejects.toThrow('could not be opened')
    expect((await a.storage.load()).library.items).toHaveLength(1)
  })
})

describe('restoring a backup', () => {
  it('replaces the library with a daily backup after keeping a safety copy', async () => {
    const a = await setup()
    await a.storage.save({ version: 1, items: [item({ id: 'a', title: 'Alien', year: 1979 })] })
    await a.storage.save({ version: 1, items: [item({ id: 'a', title: 'Alien', year: 1979 }), item({ id: 'b', title: 'Heat', year: 1995 })] })
    const daily = (await a.service.listBackups()).find((b) => b.kind === 'daily')!
    expect(daily.items).toBe(1) // the state before the day's first change

    const restored = await a.service.restoreBackup(daily.name)
    expect(restored.items.map((i) => i.title)).toEqual(['Alien'])
    expect((await a.storage.load()).library.items).toHaveLength(1)
    const safety = (await a.service.listBackups()).find((b) => b.kind === 'restore')!
    expect(safety.items).toBe(2) // what you had before restoring
    expect(JSON.parse(await readFile(join(a.dir, 'backups', safety.name), 'utf8')).items).toHaveLength(2)
  })

  it('refuses names that are not backup files', async () => {
    const a = await setup()
    await expect(a.service.restoreBackup('../library.json')).rejects.toThrow('not a backup')
    await expect(a.service.restoreBackup('library-2026-01-01.json')).rejects.toThrow('could not be read')
  })
})
