import { SORT_LABELS } from '../lib/library'
import type { GenreFilter, GenreOption, GroupBy, SortBy } from '../lib/library'
import { MEDIA_TYPES, TYPE_PLURAL } from '../lib/vocab'
import { Button, Segmented, inputClass, selectClass } from './ui'

interface Props {
  query: string
  onQuery: (value: string) => void
  inputRef: React.Ref<HTMLInputElement>
  genre: GenreFilter | null
  genres: GenreOption[]
  onGenre: (value: GenreFilter | null) => void
  favoritesOnly: boolean
  onFavoritesOnly: (value: boolean) => void
  groupBy: GroupBy
  onGroupBy: (value: GroupBy) => void
  sortBy: SortBy
  onSortBy: (value: SortBy) => void
  view: 'grid' | 'list'
  onView: (value: 'grid' | 'list') => void
  selectMode: boolean
  onSelectMode: (value: boolean) => void
  onAdd: () => void
}

// The props are unpacked one by one on purpose: inputRef is a React ref, and the
// lint rule for refs flags any use of a props object that contains one.
// Every control is 40px tall. The search box gives way first when the window is
// narrow, and then the bar wraps onto a second row instead of squeezing buttons.
export function TopBar({
  query,
  onQuery,
  inputRef,
  genre,
  genres,
  onGenre,
  favoritesOnly,
  onFavoritesOnly,
  groupBy,
  onGroupBy,
  sortBy,
  onSortBy,
  view,
  onView,
  selectMode,
  onSelectMode,
  onAdd
}: Props): React.JSX.Element {
  const typesWithGenres = MEDIA_TYPES.filter((t) => genres.some((g) => g.type === t))

  return (
    <header className="flex flex-none flex-wrap items-center gap-3 border-b border-line px-7 py-3">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onQuery('')
            e.currentTarget.blur()
          }
        }}
        placeholder="Search title, franchise, author, notes…   Ctrl F"
        aria-label="Search library"
        className={`${inputClass} min-w-[200px] max-w-[340px] flex-1`}
      />
      <Button pressed={favoritesOnly} onClick={() => onFavoritesOnly(!favoritesOnly)}>
        ★ Favorites
      </Button>
      <select
        value={genre ? `${genre.type}|${genre.name}` : ''}
        onChange={(e) => {
          const value: string = e.target.value
          const cut = value.indexOf('|')
          onGenre(
            cut < 0
              ? null
              : { type: value.slice(0, cut) as GenreFilter['type'], name: value.slice(cut + 1) }
          )
        }}
        aria-label="Filter by genre"
        className={`${selectClass} w-[180px]`}
      >
        <option value="">All genres</option>
        {/* With one type on screen the list is flat; with several, genres stay apart by type. */}
        {typesWithGenres.map((t) => {
          const options = genres
            .filter((g) => g.type === t)
            .map((g) => (
              <option key={`${g.type}|${g.name}`} value={`${g.type}|${g.name}`}>
                {g.name} ({g.count})
              </option>
            ))
          return typesWithGenres.length > 1 ? (
            <optgroup key={t} label={TYPE_PLURAL[t]}>
              {options}
            </optgroup>
          ) : (
            options
          )
        })}
      </select>
      <div className="min-w-0 flex-1" />
      <select
        value={groupBy}
        onChange={(e) => onGroupBy(e.target.value as GroupBy)}
        aria-label="Group by"
        className={`${selectClass} w-[176px]`}
      >
        <option value="franchise">Group: Franchise</option>
        <option value="genre">Group: Genre</option>
        <option value="collection">Group: Collection</option>
        <option value="none">Group: None</option>
      </select>
      <select
        value={sortBy}
        onChange={(e) => onSortBy(e.target.value as SortBy)}
        aria-label="Sort by"
        className={`${selectClass} w-[204px]`}
      >
        {(Object.keys(SORT_LABELS) as SortBy[]).map((key) => (
          <option key={key} value={key}>
            Sort: {SORT_LABELS[key]}
          </option>
        ))}
      </select>
      <Segmented
        label="View"
        value={view}
        onChange={onView}
        options={[
          { value: 'grid', label: 'Grid' },
          { value: 'list', label: 'List' }
        ]}
      />
      <Button
        pressed={selectMode}
        onClick={() => onSelectMode(!selectMode)}
        title="Pick several items to set or remove a genre on all of them at once"
      >
        Edit several
      </Button>
      <Button variant="primary" onClick={onAdd}>
        + Add
      </Button>
    </header>
  )
}
