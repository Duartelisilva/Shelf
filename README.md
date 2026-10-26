# Shelf

A desktop app to keep track of the movies, series and books you have seen or read,
and the ones you want to. It is the successor of
[MediaTracker](https://github.com/Duartelisilva/MediaTracker) (WPF), rebuilt with
Electron, React and TypeScript for a much better interface.

<!-- Add screenshots here once the app is running: docs/screenshots/library.png -->

## Features

- **Library** with shelves grouped by franchise, genre or collection, a grid or list
  view, instant search (`Ctrl F`), favorites, genre filter and sorting (title, recently
  added, year, last seen, rating)
- **Wishlist** that moves into your library when you mark an item as seen or read
- **One form for everything**: title, year, status, rating, genres, franchise and number,
  collection, series end year and seasons, book author, watch or read dates, notes and a
  card image. Used both to add and to edit
- **Card images**: the app keeps its own copy, so the original file can be deleted
- **Genres, franchises and collections are separate for movies, series and books**
- **Several items at once**: select items and set or remove a genre on all of them
- **Stats** for movies, series and books: totals, top rated, items per year, most-followed
  franchises, top genres, most rewatched
- **Safe by default**: delete asks for confirmation and can be undone, years must be
  between 1901 and 2099, dates must exist and cannot be in the future
- **Series progress**: season and episode, with +1 episode and next season buttons, and an
  **In progress** tab for everything you are watching or reading
- **Export and import your own library** as one `.shelf` file (library and images), either
  adding to what you have or replacing it, and a **backups list with restore**
- **First-time setup**: import from MediaTracker V1, with a preview and a choice between
  genre and collection for each old "saga" value
- **Your data stays on your computer**: one JSON file, saved safely, with a daily backup
- **Settings** for the optional TMDB key, stored encrypted by Windows

## Download and run

Download `Shelf-<version>-portable.exe` from the
[Releases](../../releases) page and double-click it. Nothing to install.

The app is not code-signed, so Windows SmartScreen may warn the first time: choose
**More info**, then **Run anyway**.

## Where your data lives

In `%APPDATA%\Shelf`:

| Path | What it is |
| --- | --- |
| `library.json` | everything you entered |
| `images\` | the card images (one per item) |
| `backups\` | the library from before the first change of each day (last 14), and before every restore or replace |
| `settings.json` | your TMDB key, encrypted for your Windows account |

To move Shelf to another computer, use **Settings, Export library** and then **Import from a file**
there: that carries the images too. (The key does not travel; paste it again.)

## Importing from MediaTracker V1

Only needed once, for first-time setup. Open **Settings**, then **First-time setup**, and pick the folder with your old files
(`movies.json`, `seriess.json`, `bookss.json`, `wishlists.json`; V1 named them
after its C# classes). Importing twice does not create duplicates.

## Development

Needs Node.js 20 or newer (22 LTS recommended).

```bash
npm install
npm run dev          # run the app with live reload
npm test             # unit tests
npm run lint         # code style
npm run typecheck    # TypeScript
npm run build:win    # portable exe in dist/
```

Releases are built by GitHub Actions when a version tag is pushed; see
[docs/RELEASING.md](docs/RELEASING.md).

## How it is organised

```
src/
  main/        the background process: file storage, images, export/import, settings, IPC handlers;
               metadata/ holds everything that talks to TMDB, so the lookup can be removed cleanly
  preload/     the only functions the window may call (typed in shared/api.ts)
  renderer/    the interface (React): components/ for screens, lib/ for pure logic
  shared/      code used by both sides: data model, validation rules, V1 importer
tests/         unit tests for everything that is not drawing on screen
docs/          data model notes, release steps
```

A few decisions worth knowing about:

- **Logic is separate from the interface.** Filtering, grouping, sorting, statistics,
  editing and validation are plain functions with tests; components only display them.
- **The window never touches files.** It calls a small typed API; the main process validates
  what it receives. Saves are queued, written to a temporary file first, and refused if the
  data is not shaped like a library.
- **One set of rules.** Year and date rules live in `src/shared/rules.ts`, used by the
  importer, the forms and the checks that flag old data.
- **Images** are served through a private `shelf-image://` address that only accepts file
  names the app created.

See [docs/DATA-MODEL.md](docs/DATA-MODEL.md) for the data model and its rules.

## Roadmap

- Optional poster and detail lookup (TMDB, Open Library) where you approve every match
  (the key storage in Settings is done, the lookup itself is next)
- Light theme and a custom app icon

## License

[MIT](LICENSE)
