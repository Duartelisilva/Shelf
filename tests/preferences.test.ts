import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createPreferencesStore } from '../src/main/preferences'
import { DEFAULT_THEME } from '../src/shared/themes'

const folder = (): Promise<string> => mkdtemp(join(tmpdir(), 'shelf-prefs-'))

describe('preferences', () => {
  it('starts with the default theme', async () => {
    expect(await createPreferencesStore(await folder()).get()).toEqual({ theme: DEFAULT_THEME })
  })

  it('saves the theme and reads it back, also from a new store', async () => {
    const dir = await folder()
    await createPreferencesStore(dir).setTheme('paper')
    expect(await createPreferencesStore(dir).get()).toEqual({ theme: 'paper' })
    await createPreferencesStore(dir).setTheme('system')
    expect((await createPreferencesStore(dir).get()).theme).toBe('system')
  })

  it('refuses a theme that does not exist, and keeps the saved one', async () => {
    const dir = await folder()
    const store = createPreferencesStore(dir)
    await store.setTheme('forest')
    await expect(store.setTheme('neon' as never)).rejects.toThrow('Unknown theme')
    expect((await store.get()).theme).toBe('forest')
  })

  it('falls back to the default for a damaged file or an unknown value', async () => {
    const dir = await folder()
    await writeFile(join(dir, 'preferences.json'), '{ broken')
    expect((await createPreferencesStore(dir).get()).theme).toBe(DEFAULT_THEME)
    await writeFile(join(dir, 'preferences.json'), JSON.stringify({ theme: 'neon' }))
    expect((await createPreferencesStore(dir).get()).theme).toBe(DEFAULT_THEME)
  })

  it('handles several quick changes in order', async () => {
    const dir = await folder()
    const store = createPreferencesStore(dir)
    await Promise.all(['midnight', 'daylight', 'graphite', 'forest', 'paper'].map((t) => store.setTheme(t as never)))
    expect((await store.get()).theme).toBe('paper')
    expect(JSON.parse(await readFile(join(dir, 'preferences.json'), 'utf8')).theme).toBe('paper')
  })
})
