import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME, THEMES, isThemeChoice, resolveTheme } from '../src/shared/themes'

describe('themes', () => {
  it('has unique ids, light and dark themes, and a valid default', () => {
    const ids = THEMES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(THEMES.some((t) => t.scheme === 'light')).toBe(true)
    expect(THEMES.some((t) => t.scheme === 'dark')).toBe(true)
    expect(isThemeChoice(DEFAULT_THEME)).toBe(true)
  })

  it('accepts every theme and "system", and nothing else', () => {
    for (const t of THEMES) expect(isThemeChoice(t.id)).toBe(true)
    expect(isThemeChoice('system')).toBe(true)
    for (const bad of ['neon', '', null, undefined, 3, {}]) expect(isThemeChoice(bad)).toBe(false)
  })

  it('shows Daylight or Midnight for "system", and the chosen theme otherwise', () => {
    expect(resolveTheme('system', true)).toBe('daylight')
    expect(resolveTheme('system', false)).toBe('midnight')
    expect(resolveTheme('paper', false)).toBe('paper')
    expect(resolveTheme('forest', true)).toBe('forest')
  })
})
