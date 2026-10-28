# Poster and details lookup

An optional feature: in the Add dialog or the detail panel, **Find poster & details…**
searches TMDB (movies and series, with your own key from Settings) or Open Library
(books, no key), shows the matches with a small picture, and lets you tick what to apply.
**Nothing changes until you press Apply.**

## How it behaves

- Search results and details come from the app's main process. The window only names a
  type, a search text and an id, and never an address, so it cannot make the app fetch
  arbitrary URLs. Posters are only downloaded from `image.tmdb.org` and
  `covers.openlibrary.org`, must be real images and at most 15 MB.
- By default only gaps are ticked: a missing image, year, genres, seasons, author.
  Anything that would replace something you entered starts unticked, and so do franchise
  suggestions (TMDB's "Alien Collection" becomes the suggestion "Alien").
- TMDB's genres are spelled the way yours are when one matches ("Science Fiction"
  becomes "Sci-Fi" if you use that). Double genres for series ("Action & Adventure")
  are split in two. Genres are not suggested for books.
- Years outside 1901 to 2099 are never proposed (the same rule as everywhere else).
- An applied poster is stored as the item's own image copy, like an image you chose.
- After applying, the item remembers where the details came from in `meta`
  (source, id, the short description, when you approved it).

## Removing it

The feature lives in a few places on purpose. To remove it completely:

1. Delete the folder `src/main/metadata/`, and `src/main/settings.ts` and
   `src/main/secret.ts` (they exist only to keep the TMDB key).
2. Delete `src/renderer/src/lib/lookup.ts` and the components `LookupDialog.tsx` and
   `MetadataSection.tsx`.
3. In `ItemForm.tsx`, remove the **Find poster & details…** button and the dialog it opens;
   in `SettingsScreen.tsx`, remove `<MetadataSection />`.
4. In `src/shared/api.ts`, remove the lookup and settings types, the `metadata` and
   `settings` parts of `ShelfApi`, and their channels; remove the same handlers from
   `src/main/ipc.ts` and `src/preload/index.ts`.
5. Delete the tests `tmdb`, `openlibrary`, `lookup`, `lookupReview` and `settings`, and
   `tests/helpers/fakeFetch.ts`.
6. Optionally remove `meta` from `MediaItem` in `src/shared/types.ts` (existing files keep
   working: unknown fields are simply ignored).

Nothing else depends on it.
