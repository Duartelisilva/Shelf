# Testing Shelf by hand

The automated tests cover the logic (rules, filtering, import, export, themes...).
This list covers what they cannot: how the app looks and behaves when you use it.
Tick each box as you go. Where something is wrong, write down: **what you did, what you
expected, what happened** (and the theme, plus a screenshot if it is about looks).

Not built yet, so not to be tested: the names manager (rename or merge genres), the extra
filters (year, rating, "missing"), genres for books, and the app icon.

## 0. Before you start

- [ ] In the app: **Settings, Export library…** and keep the file somewhere safe.
- [ ] Copy the folder `%APPDATA%\Shelf` (paste that into the Explorer address bar) to
      another place. This is your safety net for everything below.

## 1. Automated checks

Open a terminal **in the project folder** (`cd C:\Users\duart\Source\Repos\Shelf`).

- [ ] `npm install` finishes without errors.
- [ ] `npm run lint` prints no errors.
- [ ] `npm run typecheck` prints no errors.
- [ ] `npm test` ends with **23 test files** and **183 tests** passing, none failing.

## 2. The exe

- [ ] `npm run build:win` finishes; `dist\` has `Shelf-2.0.0-portable.exe`.
- [ ] Double-click it: it opens (slowly the first time is normal) with your library.
- [ ] The window title says **Shelf**, and the window opens large (not tiny).
- [ ] Double-click the exe **again** while it is open: no second window appears, the open
      one comes to the front.
- [ ] Drag the window narrower: it stops at a minimum width, and the top bar moves its
      controls to a second row instead of squeezing or overlapping them.
- [ ] Close and reopen: everything is still there.

Use the exe (or `npm run dev`) for the rest; they share the same data.

## 3. Library screen

- [ ] Sidebar counts: Library = Movies + Series + Books + Wishlist.
- [ ] **Ctrl F** jumps to the search box; typing filters; **Esc** clears it and leaves the box.
- [ ] Search ignores accents and capitals (try a title with an accent without it).
- [ ] **★ Favorites** shows only favorites; pressing it again shows everything.
- [ ] The genre dropdown lists genres; in the Library tab they are grouped under
      Movies / Series / Books; picking one shows only that type's items.
- [ ] **Group** switches between Franchise, Genre, Collection and None. A genre that
      exists for movies and for books shows as two separate shelves with a type tag.
- [ ] **Sort** works for all five options. Add something new, choose _Recently added_
      and _Group: None_: the new item is first, and cards say "added dd/mm/yyyy".
- [ ] **Grid / List** switch; the list has an Added column.
- [ ] Click a shelf **title** (e.g. "Alien"): it folds; click again: it opens.
- [ ] **Collapse all** folds every shelf; the button then says **Expand all** and opens them.
- [ ] Switch to another sidebar entry and back: nothing is broken. (Shelves open again;
      that is expected.)

## 4. Edit several (bulk genres)

- [ ] Press **Edit several**, tick two or three movies, type a genre, press **Add genre**.
      The genre appears on all of them and an **Undo** toast shows up. Press Undo: gone.
- [ ] **Select this shelf** selects every item of a shelf. **Select all shown**
      and **Clear** work.
- [ ] Tick a movie **and** a book: it warns that genres are separate per type and does not
      apply.
- [ ] **Remove genre** removes it from the ticked items. **Done** leaves the mode.

## 5. The detail panel

Click a card.

- [ ] The header shows the type badge and **Added dd/mm/yyyy on the same line**.
- [ ] The buttons under it (Favorite, Choose image, Look up online) are the same width.
- [ ] **Title / Year:** change the title and click elsewhere: saved. For the year try
      `1900` and `2100` (refused, with a reason), `abc` (refused), `1901` and `2099` (accepted).
- [ ] **Status:** Wishlist to Seen adds today's date to the watch history. A movie has no
      "Watching" choice; a series and a book do.
- [ ] **Rating:** drag the slider, the value shows; **Clear** removes it.
- [ ] **Genres:** type `horror` when `Horror` exists: it becomes `Horror`. **×** removes one.
      Suggestions only show genres used by the **same type**.
- [ ] **Franchise / Number / Collection:** suggestions are per type too.
- [ ] **Watch history:** add `2/10/26` (shown as 02/10/2026), `31/02/26` (refused), a date
      in the future (refused), `1/1/95` (refused, asks for four digits), `1/1/1995` (accepted).
      **Today** adds today. **Remove** works.
- [ ] **Notes:** type, click elsewhere, reopen the item: kept.
- [ ] **Image:** _Choose image…_ with a PNG or JPG: it shows on the card. Now delete the
      original file from your computer: the image is still there after a restart.
      _Remove image_ works. A non-image file (e.g. a .txt) is refused with a message.
- [ ] **Delete…** opens a dialog naming the item; **Cancel** is focused, **Esc** cancels,
      **Delete** removes it and an **Undo** toast brings it back.

## 6. Adding items

- [ ] **+ Add** (or **Ctrl N**) from the **Library** tab asks Movie / Series / Book first.
- [ ] From the **Series** tab it starts a series, from **Books** a book, from **Wishlist** a
      wishlist item, from **Favorites** a favorite.
- [ ] Pressing **Add to library** with no title or year lists what is still needed.
- [ ] Adding something that already exists says "already in your library".
- [ ] Adding works with only title and year; the item appears (the app may switch to the
      Library tab so you can see it).
- [ ] **Cancel** after picking an image leaves nothing behind. **Esc** cancels too.
- [ ] **Tab** stays inside the dialog (it never reaches the page behind).

## 7. Series progress

- [ ] On a series: **Start watching (S1 E1)** sets Watching, and the card shows **S1 E1**.
- [ ] **+1 episode** and **Next season** change it. Typing a season higher than the
      number of seasons (once _Seasons_ is filled in) is refused.
- [ ] The **In progress** tab lists it. Marking the series **Seen** clears the progress and
      removes it from In progress.

## 8. Stats

- [ ] The **Movies / Series / Books** switch changes the lists (top rated, genres,
      franchises, rewatched, per year); the three totals at the top stay.
- [ ] The **period** selector (All time, a year) changes the numbers.
- [ ] Totals match what you see in the Library. Empty sections explain themselves
      (for example "No ratings yet").

## 9. Look up online

- [ ] Open a **movie without an image**, press **Look up online…**: results appear with
      posters. Pick one: you see a list with boxes. Everything is ticked by default.
- [ ] **Apply** sets the poster (and ticked fields). The poster survives a restart.
- [ ] Try a **series** (seasons and end year offered) and a **book** (author and cover;
      no key needed).
- [ ] Without a key saved, a movie lookup tells you to add one in Settings.
- [ ] **Esc** inside the lookup closes **only the lookup**, also when it is opened from the
      Add dialog.
- [ ] Turn off your internet and search: a clear message, not a frozen window.

## 10. Settings

**Appearance**

- [ ] Click each theme: the whole app changes at once. Restart: it is remembered.
- [ ] In a **light theme** (Daylight, Paper) look at: the library, the detail panel, Stats,
      a dialog, the warning banner ("N items have a missing or invalid year...") and the
      error messages. Everything must be readable.
- [ ] **Match Windows:** change Windows between light and dark mode; the app follows.

**Posters and details**

- [ ] Save your key: it shows "A key is saved (ends in xxxx)", never the key itself.
      **Test key** says TMDB accepted it. **Remove key** removes it.
- [ ] Open `%APPDATA%\Shelf\settings.json`: your key is **not** readable in it.

**Your data**

- [ ] **Export library…** creates a `.shelf` file. Rename a copy to `.zip` and open it: it
      holds `manifest.json`, `library.json` and an `images` folder.
- [ ] **Open data folder** opens `%APPDATA%\Shelf`.
- [ ] **Import from a file…** with that export: the preview says all items are
      _identical_, 0 new. **Add new only** adds nothing.
- [ ] Delete one item, import the file again: it says **1 new**. **Add new only** brings it back.
- [ ] Change one item (for example set a Seen movie to Wishlist), import: it lists
      **1 different from yours** with `status (...)`. **Add new only** leaves it alone;
      **Add and update** changes it back (confirm dialog, safety copy kept).
- [ ] **Replace all** asks for confirmation and makes your library exactly the file.
- [ ] The **Backups** list shows daily copies and "Before an import / a restore" copies.
      **Restore** on one asks first, and the library then matches it. (Images are not part
      of backups; they come back through exports.)
- [ ] After a restore or replace, nothing you were looking at is shown stale.

## 11. Safety nets (optional, only with the backup from step 0)

- [ ] Close the app. In `%APPDATA%\Shelf`, rename `library.json` to `library.good.json`
      and create a new `library.json` containing only `{ broken`. Open the app: it starts
      empty with a notice, and a file `library.corrupt-...json` appears (nothing deleted).
      Close the app, delete the broken files and rename `library.good.json` back.
- [ ] Keyboard: Tab through the top bar and the Settings screen; every button and
      field can be reached and shows a focus ring.

## 11b. Added in the latest round

- [ ] **Duplicates:** try adding a movie with the same title, year and franchise as an
      existing one: refused. The same title and year with a **different franchise**: accepted.
- [ ] Edit an item so its title, year or franchise matches another item: the field shows
      "Already in your library..." and nothing is saved.
- [ ] **Series and books have a Franchise and Number field**, and group by franchise works
      in the Series and Books tabs.
- [ ] **Stats, Year in review:** opens on the current year. The year list starts at the
      year of your first watch and has nothing before it. The buttons ‹ › step through years.
- [ ] **Stats, Month:** opens on the current month. Months start at your first watch and end
      with this month; the calendar marks days with something seen; "Day by day" lists them.
- [ ] **Look up online:** every row is ticked by default, also when the item already has genres.
- [ ] Open the lookup, click on the dark area outside it, then press **Esc**: it closes.
- [ ] **Settings, key:** after opening Settings once, `%APPDATA%\Shelf\settings.json` shows
      `"tmdbKey": "enc1:..."` (unreadable), not your key. Test key still works.
- [ ] (Only for a brand new setup) the V1 import no longer asks about genres or collections,
      and imports none.

## 11c. Icon and loading screens

- [ ] The built exe shows the new icon (four coloured books on a shelf) in Explorer, in the
      taskbar and in the window corner. Windows keeps old icons in a cache: if you still see
      the Electron icon, restart Explorer or rename the exe once.
- [ ] Starting the **portable exe** shows a small splash image with the icon while it unpacks
      (not in `npm run dev`).
- [ ] When the app opens you briefly see the logo, "Shelf" and a moving bar before the library
      appears, in the colours of your theme.

## 12. When you are done

Send me the list of boxes that failed, with what you did, expected and saw. If everything
passed, tell me too: then only the names manager, the extra filters, book genres and the
icon are left.
