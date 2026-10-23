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

In the UI the library can be grouped by franchise, by genre, or not at all. An
item with two genres shows under both genre shelves but is counted once in the
totals and stats. Genre filters work on any number of genres.

## V1 import mapping

| V1 | V2 |
| --- | --- |
| `Saga` | `genres` (one entry; reviewed in the import preview, so it can be reassigned or split) |
| `Franchise` / `FranchiseNumber` | `franchise` / `franchiseOrder` |
| `BookNumber` | `franchiseOrder` |
| `WatchDates` | `dates` (finished items) |
| `Note` / `IsFavorite` / `BaseColor` | `notes` / `isFavorite` / `color` |
| `YearEnd` / `NumberOfSeasons` | `yearEnd` / `seasons` |
| `Author` | `author` |
| Wishlist item | `status: "wishlist"` with its `Type` as `type` |

Items with at least one watch date become `finished`; the rest keep their V1
list (library items without dates stay `in-progress`, wishlist stays `wishlist`).
