// Settings that hold secrets (for now the TMDB key). The key is encrypted with
// the operating system's own secure storage before it is written, and it never
// goes back to the window: the window only learns whether a key exists and its
// last four characters.

import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import type { KeyCheck, SettingsStatus } from '../shared/api'

export interface SecretBox {
  available(): boolean
  encrypt(text: string): string
  decrypt(encoded: string): string
}

export interface SettingsStore {
  status(): Promise<SettingsStatus>
  saveTmdbKey(key: string): Promise<KeyCheck>
  clearTmdbKey(): Promise<void>
  getTmdbKey(): Promise<string | null>
}

interface SettingsFile {
  version: 1
  tmdbKey?: string // encrypted
}

// Both kinds of TMDB credential (the 32-character "API Key" and the long
// "API Read Access Token") are made of these characters.
const KEY_FORMAT = /^[A-Za-z0-9._-]{16,}$/

export function createSettingsStore(dir: string, box: SecretBox): SettingsStore {
  const file = join(dir, 'settings.json')
  let queue: Promise<void> = Promise.resolve()

  async function read(): Promise<SettingsFile> {
    try {
      const parsed = JSON.parse(await fs.readFile(file, 'utf8')) as Partial<SettingsFile>
      return { version: 1, tmdbKey: typeof parsed.tmdbKey === 'string' ? parsed.tmdbKey : undefined }
    } catch {
      return { version: 1 }
    }
  }

  function write(settings: SettingsFile): Promise<void> {
    const run = queue.then(async () => {
      await fs.mkdir(dir, { recursive: true })
      const temporary = `${file}.tmp`
      await fs.writeFile(temporary, JSON.stringify(settings, null, 2), 'utf8')
      await fs.rename(temporary, file)
    })
    queue = run.catch(() => undefined)
    return run
  }

  async function getTmdbKey(): Promise<string | null> {
    const { tmdbKey } = await read()
    if (!tmdbKey) return null
    try {
      return box.decrypt(tmdbKey)
    } catch {
      return null // for example the file came from another Windows account
    }
  }

  return {
    async status() {
      const key = await getTmdbKey()
      return {
        tmdb: key ? { hasKey: true, hint: key.slice(-4) } : { hasKey: false },
        encryption: box.available()
      }
    },

    async saveTmdbKey(key) {
      const trimmed = key.trim()
      if (!KEY_FORMAT.test(trimmed)) {
        return {
          ok: false,
          error: 'That does not look like a TMDB key. Paste the "API Key" or the "API Read Access Token" from your TMDB account.'
        }
      }
      if (!box.available()) {
        return { ok: false, error: 'Secure storage is not available on this computer, so the key was not saved.' }
      }
      await write({ ...(await read()), version: 1, tmdbKey: box.encrypt(trimmed) })
      return { ok: true }
    },

    async clearTmdbKey() {
      const { tmdbKey: _removed, ...rest } = await read()
      void _removed
      await write({ ...rest, version: 1 })
    },

    getTmdbKey
  }
}
