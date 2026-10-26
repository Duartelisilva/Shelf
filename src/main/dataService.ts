// Export, import and restore of the whole library. Works on paths it is given
// (the file pickers live in ipc.ts), so it can be tested on its own.

import { promises as fs } from 'node:fs'
import { basename } from 'node:path'
import type { BackupInfo, DataImportSummary, ExportResult, ImportMode, ImportPreview } from '../shared/api'
import { mergeIntoLibrary } from '../shared/importV1'
import type { Library, MediaItem } from '../shared/types'
import { buildArchive, parseArchive } from './archive'
import type { ParsedArchive } from './archive'
import { listBackups, readBackup } from './backups'
import type { ImageStore } from './imageStore'
import type { Storage } from './storage'

const MAX_ARCHIVE_BYTES = 2 * 1024 * 1024 * 1024

export interface PendingImport {
  preview: ImportPreview
  commit(mode: ImportMode): Promise<DataImportSummary>
}

export interface DataService {
  exportTo(path: string): Promise<ExportResult>
  inspect(path: string): Promise<PendingImport>
  listBackups(): Promise<BackupInfo[]>
  restoreBackup(name: string): Promise<Library>
}

interface Deps {
  storage: Storage
  images: ImageStore
  backupsDir: string
  appVersion: string
  now?: () => Date
}

export function createDataService({ storage, images, backupsDir, appVersion, now = () => new Date() }: Deps): DataService {
  async function exportTo(path: string): Promise<ExportResult> {
    await storage.flush()
    const { library } = await storage.load()
    const built = await buildArchive({
      library,
      readImage: (name) => images.read(name),
      appVersion,
      now: now()
    })
    const temporary = `${path}.tmp`
    await fs.writeFile(temporary, built.data)
    await fs.rename(temporary, path)
    return { path, items: library.items.length, images: built.images }
  }

  async function inspect(path: string): Promise<PendingImport> {
    const info = await fs.stat(path)
    if (info.size > MAX_ARCHIVE_BYTES) throw new Error('This file is too large to import.')
    const parsed = await parseArchive(await fs.readFile(path))
    const { library: current } = await storage.load()

    const merge = mergeIntoLibrary(current, parsed.library.items)
    const items = parsed.library.items
    const count = (type: string): number =>
      items.filter((i) => i.type === type && i.status !== 'wishlist').length

    const preview: ImportPreview = {
      file: basename(path),
      exportedAt: parsed.manifest.exportedAt,
      appVersion: parsed.manifest.appVersion,
      counts: {
        movies: count('movie'),
        series: count('series'),
        books: count('book'),
        wishlist: items.filter((i) => i.status === 'wishlist').length
      },
      images: parsed.images.size,
      newItems: merge.added,
      alreadyHere: merge.skipped,
      warnings: parsed.warnings
    }
    return { preview, commit: (mode) => commit(parsed, mode) }
  }

  // Makes sure an imported item's image is stored, or drops the reference.
  async function withImage(item: MediaItem, parsed: ParsedArchive, warnings: string[]): Promise<MediaItem> {
    if (!item.image) return item
    const bytes = parsed.images.get(item.image)
    if (bytes) {
      await images.writeCopy(item.image, bytes)
      return item
    }
    if (await images.exists(item.image)) return item
    warnings.push(`The image of "${item.title}" is not in the file and was left out.`)
    const { image: _gone, ...rest } = item
    void _gone
    return rest
  }

  async function commit(parsed: ParsedArchive, mode: ImportMode): Promise<DataImportSummary> {
    const warnings = [...parsed.warnings]
    await storage.flush()
    const { library: current } = await storage.load()

    if (mode === 'replace') {
      await storage.snapshot('import')
      const items: MediaItem[] = []
      for (const item of parsed.library.items) items.push(await withImage(item, parsed, warnings))
      const library: Library = { version: 1, items }
      await storage.save(library)
      return { mode, added: items.length, skipped: 0, warnings, library }
    }

    const merged = mergeIntoLibrary(current, parsed.library.items)
    const fresh = merged.library.items.slice(current.items.length)
    const stored: MediaItem[] = []
    for (const item of fresh) stored.push(await withImage(item, parsed, warnings))
    const library: Library = { ...current, items: [...current.items, ...stored] }
    await storage.save(library)
    return { mode, added: merged.added, skipped: merged.skipped, warnings, library }
  }

  async function restoreBackup(name: string): Promise<Library> {
    const library = await readBackup(backupsDir, name)
    await storage.snapshot('restore')
    await storage.save(library)
    return library
  }

  return { exportTo, inspect, listBackups: () => listBackups(backupsDir), restoreBackup }
}
