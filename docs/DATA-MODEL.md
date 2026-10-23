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
