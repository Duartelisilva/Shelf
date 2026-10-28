# Data model

Shelf stores everything in one `library.json` (see `src/shared/types.ts`).

## Genres vs. franchises

V1 had a single `Saga` text field that was used as a genre ("Horror"), while
actual series of films lived in `Franchise`. That breaks down for films that
belong to several genres (a horror thriller), so V2 splits the two ideas:

| Idea | Field | Cardinality | Example |
| --- | --- | --- | --- |
| Genre | `genres` | many per item | `["Horror", "Thriller"]` |
| Franchise / series | `franchise` + `franchiseOrder` | one per item | `The Lord of the Rings`, 2 |
| Collection | `collection` | one per item | `Marvel`, `Keanu Reeves` (groups several franchises or one actor's films) |

In the UI the library can be grouped by franchise, by genre, or not at all. An
item with two genres shows under both genre shelves but is counted once in the
totals and stats. Genre filters work on any number of genres.

## V1 import mapping

| V1 | V2 |
| --- | --- |
| `Saga` | `genres` or `collection`, chosen per value in the import preview (V1 mixed both: "Horror" is a genre, "Marvel" is a collection). A collection that repeats the franchise name is dropped |
| `Franchise` / `FranchiseNumber` | `franchise` / `franchiseOrder` |
| `BookNumber` | `franchiseOrder` |
| `WatchDates` | `dates` (finished items) |
| `Note` / `IsFavorite` / `BaseColor` | `notes` / `isFavorite` / `color` |
| `YearEnd` / `NumberOfSeasons` | `yearEnd` / `seasons` |
| `Author` | `author` |
| Wishlist item | `status: "wishlist"` with its `Type` as `type` |

Every V1 library item becomes `finished`, whether or not it has a watch date:
a movie seen years ago may simply have no date. Wishlist items stay `wishlist`.

## Status and dates

`status` is the source of truth for "seen", not `dates`. Items without a date
count in the totals and top lists, and are left out only of the per-year chart.

## Validation

- Every movie, series and book needs a year, above 1900 and below 2100 (`MIN_YEAR`
  and `MAX_YEAR` in `src/shared/rules.ts`, a one-line change if that ever needs to move).
- Watch and read dates follow the same range, must be real calendar dates and cannot be
  in the future. They are typed as `dd/mm/yy` (or `dd/mm/yyyy`), shown as `dd/mm/yyyy`
  and stored as ISO. A two-digit year always means 20xx; dates before 2000 need all four
  digits (typing `1/1/95` is refused with that hint instead of being guessed).
- A series end year cannot be before its start year.
- Old data is never rejected: the importer keeps items with a bad year and warns,
  and the library offers a "needs attention" filter.

## Images

Each item has at most one image (`image`), a copy stored in the app's own folder
under a unique name, so the original file can be deleted. Replacing or removing an
image deletes the old copy. Copies that no item uses are cleaned up at startup.

## Names belong to one type

Genres, franchises (series, for books) and collections are kept apart for movies,
series and books: the genres of books are not the genres of movies. The stored
values are plain text, but everything that uses them treats a name together with
its type as one thing:

- suggestions while typing only list names used by items of the same type
- shelves grouped by genre, franchise or collection never mix types (when several
  types are on screen each shelf carries a small type tag)
- the genre filter lists genres under their type
- changing genres on several items at once needs a selection of one type
- Stats show genres, franchises and ratings for one type at a time

## Lookup details

When details from the optional lookup are applied, the item gets `meta` (source, id, short
description, approval time). See [METADATA.md](METADATA.md), which also explains how to
remove the feature.

## Series progress

A series being watched can carry `progress: { season, episode }`, the last episode seen.
It only exists while the status is *in progress* (finishing the series or moving it back
to the wishlist clears it), the season cannot be higher than `seasons` when that is filled
in, and the "In progress" tab lists everything being watched or read.

## Export file and backups

An export is a `.shelf` file, which is a plain zip (rename it to `.zip` to look inside):

```
manifest.json   app, format version, app version, date, item and image counts
library.json    the library exactly as Shelf stores it
images/<name>   the card images the items use, under their stored names
```

Import reads only those names and never uses a name from the file as a path. It either
adds the new items (skipping those already there, matched by id and by type, title and
year) or replaces the library, after keeping a copy of the current one.

`backups/` holds a copy of the library from before the first change of each day (the last
14) and a copy before every restore or replace (the newest 5 of each). Backups contain the
library only; unused card images are deleted after two weeks, so a restore shortly after
still finds its images.

## Secrets

The TMDB key lives in `settings.json`, encrypted with Electron's `safeStorage` (Windows
ties it to your account). The window can save, test and remove it but never reads it back.

### Import modes

The import preview compares the file with your library by item id and lists what differs
(for example `status (wishlist -> seen or read)`, `rating`). Three modes:

- **Add new only**: adds items you do not have; existing items are never touched.
- **Add and update**: also gives the items that differ the file's version, after keeping a
  safety copy.
- **Replace all**: your library becomes exactly the file, after keeping a safety copy.
