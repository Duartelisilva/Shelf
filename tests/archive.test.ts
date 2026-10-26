import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { buildArchive, parseArchive } from '../src/main/archive'
import type { Library, MediaItem } from '../src/shared/types'

const ID = '123e4567-e89b-12d3-a456-426614174000'
const IMAGE = `${ID}-abc123.png`
const MISSING = `${ID}-def456.png`

const item = (over: Partial<MediaItem> & { id: string; title: string }): MediaItem => ({
  type: 'movie', status: 'finished', genres: [], dates: [], isFavorite: false,
  createdAt: '2026-01-01T00:00:00.000Z', ...over
})
const library: Library = {
  version: 1,
  items: [item({ id: 'a', title: 'Alien', year: 1979, image: IMAGE }), item({ id: 'b', title: 'Heat', year: 1995, image: MISSING })]
}
const readImage = async (name: string): Promise<Buffer | null> => (name === IMAGE ? Buffer.from('png bytes') : null)
const now = new Date('2026-10-26T12:00:00.000Z')

async function zipOf(files: Record<string, string>): Promise<Buffer> {
  const zip = new JSZip()
  for (const [name, text] of Object.entries(files)) zip.file(name, text)
  return zip.generateAsync({ type: 'nodebuffer' })
}
const manifest = (over: object = {}): string =>
  JSON.stringify({ app: 'Shelf', format: 1, appVersion: '2.0.0', exportedAt: now.toISOString(), items: 0, images: 0, ...over })

describe('archive', () => {
  it('writes and reads back the library with its images and a manifest', async () => {
    const built = await buildArchive({ library, readImage, appVersion: '2.0.0', now })
    expect(built.images).toBe(1)
    const parsed = await parseArchive(built.data)
    expect(parsed.manifest).toMatchObject({ app: 'Shelf', format: 1, appVersion: '2.0.0', items: 2, images: 1 })
    expect(parsed.images.get(IMAGE)?.toString()).toBe('png bytes')
    expect(parsed.library.items.map((i) => i.title)).toEqual(['Alien', 'Heat'])
  })

  it('leaves out the image of an item whose image file is missing, and says so', async () => {
    const built = await buildArchive({ library, readImage, appVersion: '2.0.0', now })
    expect(built.warnings).toHaveLength(1)
    const parsed = await parseArchive(built.data)
    expect(parsed.library.items[1].image).toBeUndefined()
    expect(parsed.library.items[0].image).toBe(IMAGE)
  })

  it('refuses a file that is not a zip', async () => {
    await expect(parseArchive(Buffer.from('nope'))).rejects.toThrow('could not be opened')
  })

  it('refuses a zip without a manifest or library', async () => {
    await expect(parseArchive(await zipOf({ 'library.json': '{}' }))).rejects.toThrow('missing')
  })

  it('refuses another app, a newer format and an invalid library', async () => {
    const good = JSON.stringify(library)
    await expect(parseArchive(await zipOf({ 'manifest.json': manifest({ app: 'Other' }), 'library.json': good }))).rejects.toThrow('not a Shelf export')
    await expect(parseArchive(await zipOf({ 'manifest.json': manifest({ format: 2 }), 'library.json': good }))).rejects.toThrow('newer version')
    await expect(
      parseArchive(await zipOf({ 'manifest.json': manifest(), 'library.json': JSON.stringify({ version: 1, items: [{ x: 1 }] }) }))
    ).rejects.toThrow('not a valid Shelf library')
  })

  it('ignores images with names Shelf would never create', async () => {
    const parsed = await parseArchive(
      await zipOf({ 'manifest.json': manifest(), 'library.json': JSON.stringify(library), 'images/evil.exe': 'x', [`images/${IMAGE}`]: 'ok' })
    )
    expect([...parsed.images.keys()]).toEqual([IMAGE])
    expect(parsed.warnings).toHaveLength(1)
  })
})
