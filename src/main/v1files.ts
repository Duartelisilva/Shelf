// Reads the MediaTracker V1 files from a folder the user picked.

import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { V1_FILE_NAMES, parseV1Json } from '../shared/importV1'
import type { V1Files } from '../shared/importV1'

export interface V1Folder {
  files: V1Files
  found: string[]
  missing: string[]
  problems: string[]
}

export async function readV1Folder(folder: string): Promise<V1Folder> {
  const files: V1Files = {}
  const found: string[] = []
  const missing: string[] = []
  const problems: string[] = []

  for (const [key, name] of Object.entries(V1_FILE_NAMES) as [keyof V1Files, string][]) {
    let text: string
    try {
      text = await fs.readFile(join(folder, name), 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') missing.push(name)
      else problems.push(`${name}: could not be opened`)
      continue
    }
    try {
      files[key] = parseV1Json(text)
      found.push(name)
    } catch {
      problems.push(`${name}: is not valid JSON`)
    }
  }
  return { files, found, missing, problems }
}
