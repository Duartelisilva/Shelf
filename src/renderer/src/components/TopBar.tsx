import { SORT_LABELS } from '../lib/library'
import type { GenreFilter, GenreOption, GroupBy, SortBy } from '../lib/library'
import { MEDIA_TYPES, TYPE_PLURAL } from '../lib/vocab'

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

const control = 'rounded-lg border border-edge bg-surface px-3 py-2 text-ink'

// The props are unpacked one by one on purpose: inputRef is a React ref, and the
// lint rule for refs flags any use of a props object that contains one.
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
    <header className="flex h-[72px] flex-none items-center gap-3 border-b border-line px-7">
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
        className={`w-[320px] ${control}`}
      />
      <button
        type="button"
        onClick={() => onFavoritesOnly(!favoritesOnly)}
        aria-pressed={favoritesOnly}
        className={`cursor-pointer rounded-full border px-3.5 py-2 ${
          favoritesOnly
            ? 'border-transparent bg-accent-soft font-bold text-accent'
            : 'border-edge text-muted'
        }`}
      >
        ★ Favorites
      </button>
      <select
        value={genre ? `${genre.type}|${genre.name}` : ''}
        onChange={(e) => {
          const value: string = e.target.value
          const cut = value.indexOf('|')
          onGenre(cut < 0 ? null : { type: value.slice(0, cut) as GenreFilter['type'], name: value.slice(cut + 1) })
        }}
        aria-label="Filter by genre"
        className={control}
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
      <div className="flex-1" />
      <select
        value={groupBy}
        onChange={(e) => onGroupBy(e.target.value as GroupBy)}
        aria-label="Group by"
        className={control}
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
        className={control}
      >
        {(Object.keys(SORT_LABELS) as SortBy[]).map((key) => (
          <option key={key} value={key}>
            Sort: {SORT_LABELS[key]}
          </option>
        ))}
      </select>
      <div className="flex overflow-hidden rounded-lg border border-edge">
        {(['grid', 'list'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onView(mode)}
            aria-pressed={view === mode}
            className={`cursor-pointer px-3 py-2 capitalize ${
              view === mode ? 'bg-accent-soft font-bold text-accent' : 'text-muted'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onSelectMode(!selectMode)}
        aria-pressed={selectMode}
        title="Pick several items to set or remove a genre on all of them at once"
        className={`cursor-pointer rounded-lg border px-3 py-2 ${
          selectMode ? 'border-accent font-bold text-accent' : 'border-edge text-muted'
        }`}
      >
        Edit several
      </button>
      <button
        type="button"
        onClick={onAdd}
        className="cursor-pointer rounded-[10px] bg-accent px-[18px] py-2.5 font-extrabold text-on-accent"
      >
        + Add
      </button>
    </header>
  )
}
