// The colour themes. Their colours live in main.css (one block per theme); this
// file only lists which themes exist. Shared so the main process can check what
// the window asks it to save.

export const THEMES = [
  { id: 'midnight', name: 'Midnight', scheme: 'dark' },
  { id: 'graphite', name: 'Graphite', scheme: 'dark' },
  { id: 'forest', name: 'Forest', scheme: 'dark' },
  { id: 'daylight', name: 'Daylight', scheme: 'light' },
  { id: 'paper', name: 'Paper', scheme: 'light' }
] as const

export type ThemeId = (typeof THEMES)[number]['id']

// "system" follows the light or dark setting of Windows.
export type ThemeChoice = ThemeId | 'system'

export const DEFAULT_THEME: ThemeChoice = 'midnight'

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === 'system' || THEMES.some((theme) => theme.id === value)
}

// The theme actually shown for a choice. For "system": Daylight in light mode, Midnight in dark mode.
export function resolveTheme(choice: ThemeChoice, systemPrefersLight: boolean): ThemeId {
  if (choice === 'system') return systemPrefersLight ? 'daylight' : 'midnight'
  return choice
}
