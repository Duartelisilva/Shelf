// Saves and loads the library as one JSON file. Takes the folder as a
// parameter (instead of asking Electron) so it can be tested on its own.
//
// Safety measures:
// - writes go to a temporary file first, then replace the real one, so a crash
//   mid-save cannot leave a half-written library
// - the first save of each day keeps a copy in backups/ (the last 14 are kept)
// - a file that cannot be read is moved aside, never overwritten or deleted

import { constants, promises as fs } from 'node:fs'
import { join } from 'node:path'
import type { Library } from '../shared/types'
import type { LoadResult } from '../shared/api'

export const FILE_NAME = 'library.json'

export function emptyLibrary(): Library {
  return { version: 1, items: [] }
}

export interface StorageOptions {
  keepBackups?: number
  now?: () => Date
}

export interface Storage {
  load(): Promise<LoadResult>
  save(library: Library): Promise<void>
}

export function createStorage(dir: string, options: StorageOptions = {}): Storage {
  const keepBackups = options.keepBackups ?? 14
  const now = options.now ?? ((): Date => new Date())
  const file = join(dir, FILE_NAME)
  const backupDir = join(dir, 'backups')

  async function load(): Promise<LoadResult> {
    let raw: string
    try {
      raw = await fs.readFile(file, 'utf8')
    } catch (error) {
      if (isMissing(error)) return { library: emptyLibrary() }
      throw error
    }
    try {
      const parsed: unknown = JSON.parse(raw.replace(/^\uFEFF/, ''))
      if (isLibrary(parsed)) return { library: parsed }
    } catch {
      // fall through to the recovery below
    }
    const aside = `library.corrupt-${now().toISOString().replace(/[:.]/g, '-')}.json`
    await fs.rename(file, join(dir, aside))
    return {
      library: emptyLibrary(),
      notice: `The library file could not be read. It was kept as ${aside}.`
    }
  }

  async function save(library: Library): Promise<void> {
    await fs.mkdir(dir, { recursive: true })
    await backupOncePerDay()
    const temporary = `${file}.tmp`
    await fs.writeFile(temporary, JSON.stringify(library, null, 2), 'utf8')
    await fs.rename(temporary, file)
  }

  async function backupOncePerDay(): Promise<void> {
    try {
      await fs.access(file)
    } catch {
      return // nothing to back up yet
    }
    await fs.mkdir(backupDir, { recursive: true })
    const target = join(backupDir, `library-${dayStamp(now())}.json`)
    try {
      await fs.copyFile(file, target, constants.COPYFILE_EXCL)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') return // already done today
      throw error
    }
    const backups = (await fs.readdir(backupDir))
      .filter((name) => /^library-\d{4}-\d{2}-\d{2}\.json$/.test(name))
      .sort()
    for (const old of backups.slice(0, Math.max(0, backups.length - keepBackups))) {
      await fs.unlink(join(backupDir, old))
    }
  }

  return { load, save }
}

function isLibrary(value: unknown): value is Library {
  if (!value || typeof value !== 'object') return false
  const library = value as { version?: unknown; items?: unknown }
  return library.version === 1 && Array.isArray(library.items)
}

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === 'ENOENT'
}

function dayStamp(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
