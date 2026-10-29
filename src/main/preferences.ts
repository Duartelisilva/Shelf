// Settings that are not secret, kept in preferences.json next to the library
// (for now only the colour theme). A missing or unreadable file means defaults.

import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import type { Preferences } from '../shared/api'
import { DEFAULT_THEME, isThemeChoice } from '../shared/themes'
import type { ThemeChoice } from '../shared/themes'

export interface PreferencesStore {
  get(): Promise<Preferences>
  setTheme(theme: ThemeChoice): Promise<void>
}

export function createPreferencesStore(dir: string): PreferencesStore {
  const file = join(dir, 'preferences.json')
  let queue: Promise<void> = Promise.resolve()

  async function get(): Promise<Preferences> {
    try {
      const parsed = JSON.parse(await fs.readFile(file, 'utf8')) as { theme?: unknown }
      return { theme: isThemeChoice(parsed.theme) ? parsed.theme : DEFAULT_THEME }
    } catch {
      return { theme: DEFAULT_THEME }
    }
  }

  async function setTheme(theme: ThemeChoice): Promise<void> {
    if (!isThemeChoice(theme)) throw new Error('Unknown theme.')
    const run = queue.then(async () => {
      await fs.mkdir(dir, { recursive: true })
      const temporary = `${file}.tmp`
      await fs.writeFile(temporary, JSON.stringify({ version: 1, theme }, null, 2), 'utf8')
      await fs.rename(temporary, file)
    })
    queue = run.catch(() => undefined)
    return run
  }

  return { get, setTheme }
}
