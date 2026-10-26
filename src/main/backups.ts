// Lists and reads the library copies kept in the backups folder: the daily ones
// (see storage.ts) and the safety copies made before a restore or an import.

import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import type { BackupInfo } from '../shared/api'
import type { Library } from '../shared/types'
import { isWellFormed } from './storage'

const DAILY = /^library-(\d{4}-\d{2}-\d{2})\.json$/
const SAFETY = /^before-(restore|import)-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z\.json$/

const parse = (text: string): unknown => JSON.parse(text.replace(/^\uFEFF/, ''))

export async function listBackups(dir: string): Promise<BackupInfo[]> {
  let names: string[]
  try {
    names = await fs.readdir(dir)
  } catch {
    return []
  }
  const backups: BackupInfo[] = []
  for (const name of names) {
    const daily = DAILY.exec(name)
    const safety = SAFETY.exec(name)
    if (!daily && !safety) continue
    try {
      const library = parse(await fs.readFile(join(dir, name), 'utf8'))
      if (!isWellFormed(library)) continue
      const info = await fs.stat(join(dir, name))
      backups.push({
        name,
        kind: daily ? 'daily' : (safety![1] as 'restore' | 'import'),
        date: daily ? daily[1] : `${safety![2]}T${safety![3]}:${safety![4]}:${safety![5]}.${safety![6]}Z`,
        items: library.items.length,
        bytes: info.size
      })
    } catch {
      // a file we cannot read is not offered
    }
  }
  return backups.sort((a, b) => b.date.localeCompare(a.date))
}

export async function readBackup(dir: string, name: string): Promise<Library> {
  if (!DAILY.test(name) && !SAFETY.test(name)) throw new Error('That is not a backup file.')
  let library: unknown
  try {
    library = parse(await fs.readFile(join(dir, name), 'utf8'))
  } catch {
    throw new Error('That backup could not be read.')
  }
  if (!isWellFormed(library)) throw new Error('That backup is not a valid library.')
  return library
}
