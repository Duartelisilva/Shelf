# Shelf

A desktop app to track the movies, series and books you have seen or read, and
the ones you want to. Successor to [MediaTracker](https://github.com/Duartelisilva/MediaTracker)
(WPF), rebuilt with a modern UI.

## Features

- Poster grid with franchise and genre shelves, list view, instant search (`Ctrl F`)
- Wishlist that moves into the library when you mark an item as seen
- Several genres per item, one franchise per item
- Watch and read history, ratings, favorites, notes, per-item accent color
- Stats: top rated, items per year, split by type, most-followed franchises
- Optional poster and metadata lookup (TMDB, Open Library). Matches are only
  proposed; nothing is saved until you approve it
- Import from MediaTracker V1 JSON files, with a preview
- Local-only data, portable `.exe`

## Stack

Electron, React, TypeScript, Tailwind CSS, built with electron-vite and packaged
with electron-builder. Releases are built by GitHub Actions.

## Development

```bash
npm install
npm run dev
npm run build:win   # portable exe in dist/
```

## Roadmap

1. Project setup and data model
2. V1 importer
3. Library screen, detail panel, stats
4. Metadata lookup (isolated in `src/main/metadata`, removable)
