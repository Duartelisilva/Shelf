// The Shelf export file (.shelf): a zip holding the library and its images.
//
//   manifest.json   what this is: app, format version, when, how many
//   library.json    the library, as Shelf stores it
//   images/<name>   the card images the items use, under their stored names
//
// Anything else inside is ignored, and nothing in it is ever used as a path on
// disk: image names must match the exact format Shelf creates.

import JSZip from 'jszip'
import type { Library, MediaItem } from '../shared/types'
import { IMAGE_NAME, MAX_IMAGE_BYTES } from './imageStore'
import { isWellFormed } from './storage'

export const ARCHIVE_EXTENSION = 'shelf'
const FORMAT = 1
const MAX_LIBRARY_BYTES = 100 * 1024 * 1024

export interface Manifest {
  app: 'Shelf'
  format: number
  appVersion: string
  exportedAt: string
  items: number
  images: number
}

export interface ParsedArchive {
  manifest: Manifest
  library: Library
  images: Map<string, Buffer>
  warnings: string[]
}

export async function buildArchive(input: {
  library: Library
  readImage: (fileName: string) => Promise<Buffer | null>
  appVersion: string
  now: Date
}): Promise<{ data: Buffer; images: number; warnings: string[] }> {
  const zip = new JSZip()
  const warnings: string[] = []
  const found = new Set<string>()

  for (const item of input.library.items) {
    if (!item.image || found.has(item.image)) continue
    const bytes = await input.readImage(item.image)
    if (bytes) {
      // Images are already compressed, so they are stored as they are.
      zip.file(`images/${item.image}`, bytes, { compression: 'STORE' })
      found.add(item.image)
    }
  }
  // An item whose image file is missing is exported without the image.
  const items: MediaItem[] = input.library.items.map((item) => {
    if (!item.image || found.has(item.image)) return item
    warnings.push(`The image of "${item.title}" was missing and was left out.`)
    const { image: _missing, ...rest } = item
    void _missing
    return rest
  })
  const library: Library = { ...input.library, items }

  const manifest: Manifest = {
    app: 'Shelf',
    format: FORMAT,
    appVersion: input.appVersion,
    exportedAt: input.now.toISOString(),
    items: items.length,
    images: found.size
  }
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))
  zip.file('library.json', JSON.stringify(library, null, 2))

  const data = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })
  return { data, images: found.size, warnings }
}

// Reads the size an entry will have once unpacked, before unpacking it, so a
// file cannot make the app unpack something huge.
function unpackedSize(entry: JSZip.JSZipObject): number | undefined {
  return (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize
}

function readJson(text: string): unknown {
  return JSON.parse(text.replace(/^\uFEFF/, ''))
}

export async function parseArchive(data: Buffer): Promise<ParsedArchive> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(data)
  } catch {
    throw new Error('This file could not be opened. Is it a Shelf export?')
  }

  const manifestFile = zip.file('manifest.json')
  const libraryFile = zip.file('library.json')
  if (!manifestFile || !libraryFile) {
    throw new Error('This is not a Shelf export: manifest.json or library.json is missing.')
  }
  if ((unpackedSize(libraryFile) ?? 0) > MAX_LIBRARY_BYTES) throw new Error('The library in this file is too large.')

  let manifest: Manifest
  try {
    manifest = readJson(await manifestFile.async('string')) as Manifest
  } catch {
    throw new Error('This is not a Shelf export: manifest.json cannot be read.')
  }
  if (!manifest || manifest.app !== 'Shelf' || typeof manifest.format !== 'number') {
    throw new Error('This is not a Shelf export.')
  }
  if (manifest.format > FORMAT) {
    throw new Error('This file was made by a newer version of Shelf. Update Shelf to open it.')
  }
  if (manifest.format !== FORMAT) throw new Error('This export format is not supported.')

  let library: unknown
  try {
    library = readJson(await libraryFile.async('string'))
  } catch {
    throw new Error('library.json in this file cannot be read.')
  }
  if (!isWellFormed(library)) throw new Error('library.json in this file is not a valid Shelf library.')

  const warnings: string[] = []
  const images = new Map<string, Buffer>()
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir || !path.startsWith('images/')) continue
    const name = path.slice('images/'.length)
    if (!IMAGE_NAME.test(name)) {
      warnings.push(`Ignored a file with an unexpected name: ${name}`)
      continue
    }
    if ((unpackedSize(entry) ?? 0) > MAX_IMAGE_BYTES) {
      warnings.push(`Ignored ${name}: larger than 15 MB.`)
      continue
    }
    const bytes = await entry.async('nodebuffer')
    if (bytes.length > MAX_IMAGE_BYTES) {
      warnings.push(`Ignored ${name}: larger than 15 MB.`)
      continue
    }
    images.set(name, bytes)
  }
  return { manifest, library, images, warnings }
}
