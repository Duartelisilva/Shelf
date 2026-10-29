// Puts the chosen colour theme on the page. The theme is a data-theme attribute on
// <html>; the colours for each value are in assets/main.css.

import { DEFAULT_THEME, isThemeChoice, resolveTheme } from '../../../shared/themes'
import type { ThemeChoice } from '../../../shared/themes'

// The real choice is saved by the main process (preferences.json). This copy only
// exists so the window can use the right colours from its very first paint,
// before the saved choice has arrived.
const CACHE_KEY = 'shelf-theme'
const LIGHT_QUERY = '(prefers-color-scheme: light)'

export function applyTheme(choice: ThemeChoice): void {
  document.documentElement.dataset.theme = resolveTheme(choice, window.matchMedia(LIGHT_QUERY).matches)
  try {
    localStorage.setItem(CACHE_KEY, choice)
  } catch {
    // the copy is only an optimisation
  }
}

export function cachedTheme(): ThemeChoice {
  try {
    const stored = localStorage.getItem(CACHE_KEY)
    if (isThemeChoice(stored)) return stored
  } catch {
    // fall through to the default
  }
  return DEFAULT_THEME
}

// Calls back when Windows switches between light and dark. Returns a way to stop listening.
export function watchSystemTheme(onChange: () => void): () => void {
  const query = window.matchMedia(LIGHT_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
