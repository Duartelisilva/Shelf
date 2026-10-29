# Themes

Every colour in the interface is a named token (`ground`, `panel`, `surface`, `ink`,
`muted`, `accent`, `danger`...). No component contains a colour of its own: a theme is
just a set of values for those tokens, so adding or changing one never touches the
screens.

- The tokens and one block per theme are in `src/renderer/src/assets/main.css`.
- The list of themes (name, light or dark) is `THEMES` in `src/shared/themes.ts`.
- The chosen theme is saved in `preferences.json`, and `<html data-theme="...">` shows it.
  "Match Windows" picks Daylight or Midnight from the system setting and follows changes.
- The previews in Settings are drawn with the real tokens (each preview carries its own
  `data-theme`), so they cannot drift from the actual themes.

## Adding a theme

1. Copy one block in `main.css`, rename it `[data-theme='yourname']` and change the values
   (`color-scheme` is `dark` or `light`, so scrollbars and dropdowns match).
2. Add `{ id: 'yourname', name: 'Your name', scheme: 'dark' }` to `THEMES`.
3. Run `npm test`. `tests/themeContrast.test.ts` checks that the text colours are readable
   on every background they are used on (WCAG contrast of at least 4.5), that every theme
   defines every token, and that the default values equal Midnight. It tells you which pair
   fails.
