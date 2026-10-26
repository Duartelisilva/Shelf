import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createSettingsStore } from '../src/main/settings'
import type { SecretBox } from '../src/main/settings'

// A stand-in for the operating system's secure storage.
const box = (available = true): SecretBox => ({
  available: () => available,
  encrypt: (text) => `enc:${Buffer.from(text).toString('base64')}`,
  decrypt: (encoded) => {
    if (!encoded.startsWith('enc:')) throw new Error('cannot decrypt')
    return Buffer.from(encoded.slice(4), 'base64').toString()
  }
})
const KEY = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'

describe('settings', () => {
  it('stores the key encrypted and only reveals that it exists and its last four characters', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'shelf-settings-'))
    const store = createSettingsStore(dir, box())
    expect(await store.status()).toEqual({ tmdb: { hasKey: false }, encryption: true })
    expect(await store.saveTmdbKey(`  ${KEY}  `)).toEqual({ ok: true })
    expect(await store.status()).toEqual({ tmdb: { hasKey: true, hint: '8f90' }, encryption: true })
    expect(await store.getTmdbKey()).toBe(KEY)
    expect(await readFile(join(dir, 'settings.json'), 'utf8')).not.toContain(KEY)
  })

  it('refuses text that does not look like a key', async () => {
    const store = createSettingsStore(await mkdtemp(join(tmpdir(), 'shelf-settings-')), box())
    for (const bad of ['', 'short', 'has spaces in the middle of it all', 'a'.repeat(40) + '!']) {
      expect((await store.saveTmdbKey(bad)).ok).toBe(false)
    }
    expect((await store.status()).tmdb.hasKey).toBe(false)
  })

  it('does not save anything when secure storage is not available', async () => {
    const store = createSettingsStore(await mkdtemp(join(tmpdir(), 'shelf-settings-')), box(false))
    const result = await store.saveTmdbKey(KEY)
    expect(result.ok).toBe(false)
    expect((await store.status()).tmdb.hasKey).toBe(false)
  })

  it('removes the key, and treats a key it cannot decrypt as missing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'shelf-settings-'))
    const store = createSettingsStore(dir, box())
    await store.saveTmdbKey(KEY)
    await store.clearTmdbKey()
    expect(await store.getTmdbKey()).toBeNull()
    await store.saveTmdbKey(KEY)
    const other = createSettingsStore(dir, { ...box(), decrypt: () => { throw new Error('other account') } })
    expect(await other.getTmdbKey()).toBeNull()
  })
})
