import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { THEMES } from '../src/shared/themes'

// Reads the real stylesheet, so a theme cannot be added or changed without these
// checks seeing it. Run from the project root (npm test does).
const css = readFileSync(join(process.cwd(), 'src/renderer/src/assets/main.css'), 'utf8')

function tokens(block: string): Record<string, string> {
  const found: Record<string, string> = {}
  for (const m of block.matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6});/g)) found[m[1]] = m[2].toLowerCase()
  return found
}
const themes: Record<string, Record<string, string>> = {}
for (const m of css.matchAll(/\[data-theme='([a-z]+)'\]\s*\{([^}]*)\}/g)) themes[m[1]] = tokens(m[2])
const start = css.indexOf('@theme')
const defaults = tokens(css.slice(start, css.indexOf('}', start)))

// WCAG relative luminance and contrast ratio
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const channel = (c: number): number => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// Text colour on the backgrounds it is actually used on.
const BACKGROUNDS = ['ground', 'panel', 'surface']
const PAIRS: [string, string][] = [
  ...['ink', 'muted', 'accent', 'danger', 'warn', 'ok'].flatMap((text) => BACKGROUNDS.map((bg) => [text, bg] as [string, string])),
  ['accent', 'accent-soft'],
  ['on-accent', 'accent'],
  ['danger', 'danger-soft'],
  ['warn', 'warn-soft'],
  ['ok', 'ok-soft']
]

describe('themes in main.css', () => {
  it('has a block for every theme in the list, and none extra', () => {
    expect(Object.keys(themes).sort()).toEqual(THEMES.map((t) => t.id).sort())
  })

  it('has default values that equal Midnight, and a complete set of tokens', () => {
    expect(Object.keys(defaults).length).toBeGreaterThanOrEqual(16)
    expect(themes.midnight).toEqual(defaults)
  })

  for (const theme of THEMES) {
    describe(theme.name, () => {
      it('defines every token', () => {
        expect(Object.keys(themes[theme.id]).sort()).toEqual(Object.keys(defaults).sort())
      })

      it('is readable: every text colour has a contrast of at least 4.5 on its backgrounds', () => {
        const failing = PAIRS.filter(([text, bg]) => contrast(themes[theme.id][text], themes[theme.id][bg]) < 4.5).map(([text, bg]) => `${text} on ${bg}`)
        expect(failing).toEqual([])
      })
    })
  }
})
