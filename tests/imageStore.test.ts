import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { IMAGE_NAME, createImageStore } from '../src/main/imageStore'

const ID = '123e4567-e89b-12d3-a456-426614174000'
let dir: string
let source: string
let n = 0
beforeEach(async () => {
  const base = await mkdtemp(join(tmpdir(), 'shelf-img-'))
  dir = join(base, 'images')
  source = join(base, 'poster.PNG')
  await writeFile(source, 'fake image bytes')
})
const store = (): ReturnType<typeof createImageStore> =>
  createImageStore(dir, () => (++n).toString(16).padStart(6, '0'))

describe('image store', () => {
  it('keeps its own copy under a name tied to the item', async () => {
    const name = await store().importFile(source, ID)
    expect(IMAGE_NAME.test(name)).toBe(true)
    expect(name.startsWith(ID)).toBe(true)
    expect(await readFile(join(dir, name), 'utf8')).toBe('fake image bytes')
  })

  it('gives a replacement image a different name', async () => {
    const s = store()
    const first = await s.importFile(source, ID)
    const second = await s.importFile(source, ID)
    expect(second).not.toBe(first)
  })

  it('refuses other file types and invalid item ids', async () => {
    const text = join(dir, '..', 'notes.txt')
    await writeFile(text, 'x')
    await expect(store().importFile(text, ID)).rejects.toThrow('PNG')
    await expect(store().importFile(source, '../../evil')).rejects.toThrow()
  })

  it('removes one image, and only names it created', async () => {
    const s = store()
    const name = await s.importFile(source, ID)
    await s.remove('../poster.PNG')
    await s.remove(name)
    expect(await readdir(dir)).toEqual([])
  })

  it('removes unused copies but keeps the ones in use and unknown files', async () => {
    const s = store()
    const keep = await s.importFile(source, ID)
    const drop = await s.importFile(source, ID)
    await writeFile(join(dir, 'readme.txt'), 'not ours')
    expect(await s.removeUnused(new Set([keep]))).toBe(1)
    expect((await readdir(dir)).sort()).toEqual([keep, 'readme.txt'].sort())
    expect(s.pathOf(drop)).not.toBeNull()
    expect(s.pathOf('../x.png')).toBeNull()
  })
})

describe('image store: reading, copies and age', () => {
  it('reads a stored image, and returns null for a missing or invalid name', async () => {
    const s = store()
    const name = await s.importFile(source, ID)
    expect((await s.read(name))?.toString()).toBe('fake image bytes')
    expect(await s.read('123e4567-e89b-12d3-a456-426614174000-ffffff.png')).toBeNull()
    expect(await s.read('../poster.PNG')).toBeNull()
    expect(await s.exists(name)).toBe(true)
  })

  it('writes an image that came from an import, never replacing an existing one', async () => {
    const s = store()
    const name = '123e4567-e89b-12d3-a456-426614174000-aaaaaa.png'
    await s.writeCopy(name, Buffer.from('first'))
    await s.writeCopy(name, Buffer.from('second'))
    expect((await s.read(name))?.toString()).toBe('first')
    await expect(s.writeCopy('../evil.png', Buffer.from('x'))).rejects.toThrow('Invalid')
  })

  it('only removes unused images that are old enough', async () => {
    const s = store()
    await s.importFile(source, ID)
    expect(await s.removeUnused(new Set(), 60_000)).toBe(0) // just created: too new
    expect(await s.removeUnused(new Set(), 0)).toBe(1)
  })
})

describe('image store: downloaded images', () => {
  it('stores downloaded bytes under a name tied to the item', async () => {
    const s = store()
    const name = await s.importBytes(Buffer.from('poster'), 'JPG', ID)
    expect(name.startsWith(ID)).toBe(true)
    expect(name.endsWith('.jpg')).toBe(true)
    expect((await s.read(name))?.toString()).toBe('poster')
  })

  it('refuses a wrong type, an invalid item and a file that is too large', async () => {
    const s = store()
    await expect(s.importBytes(Buffer.from('x'), 'exe', ID)).rejects.toThrow('PNG')
    await expect(s.importBytes(Buffer.from('x'), 'png', '../evil')).rejects.toThrow('Invalid')
    await expect(s.importBytes(Buffer.alloc(15 * 1024 * 1024 + 1), 'png', ID)).rejects.toThrow('15 MB')
  })
})
