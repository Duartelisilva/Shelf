import type { GroupBy } from '../lib/library'

interface Props {
  query: string
  onQuery: (value: string) => void
  inputRef: React.Ref<HTMLInputElement>
  genre: string | null
  genres: { name: string; count: number }[]
  onGenre: (value: string | null) => void
  favoritesOnly: boolean
  onFavoritesOnly: (value: boolean) => void
  groupBy: GroupBy
  onGroupBy: (value: GroupBy) => void
  view: 'grid' | 'list'
  onView: (value: 'grid' | 'list') => void
  selectMode: boolean
  onSelectMode: (value: boolean) => void
  onAdd: () => void
}

const control = 'rounded-lg border border-edge bg-surface px-3 py-2 text-ink'

export function TopBar(props: Props): React.JSX.Element {
  const { query, genre, favoritesOnly, groupBy, view, selectMode } = props
  return (
    <header className="flex h-[72px] flex-none items-center gap-3 border-b border-line px-7">
      <input
        ref={props.inputRef}
        type="text"
        value={query}
        onChange={(e) => props.onQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            props.onQuery('')
            e.currentTarget.blur()
          }
        }}
        placeholder="Search title, franchise, author, notes…   Ctrl F"
        aria-label="Search library"
        className={`w-[320px] ${control}`}
      />
      <button
        type="button"
        onClick={() => props.onFavoritesOnly(!favoritesOnly)}
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
        value={genre ?? ''}
        onChange={(e) => props.onGenre(e.target.value || null)}
        aria-label="Filter by genre"
        className={control}
      >
        <option value="">All genres</option>
        {props.genres.map((g) => (
          <option key={g.name} value={g.name}>
            {g.name} ({g.count})
          </option>
        ))}
      </select>
      <div className="flex-1" />
      <select
        value={groupBy}
        onChange={(e) => props.onGroupBy(e.target.value as GroupBy)}
        aria-label="Group by"
        className={control}
      >
        <option value="franchise">Group: Franchise</option>
        <option value="genre">Group: Genre</option>
        <option value="collection">Group: Collection</option>
        <option value="none">Group: None</option>
      </select>
      <div className="flex overflow-hidden rounded-lg border border-edge">
        {(['grid', 'list'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => props.onView(mode)}
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
        onClick={() => props.onSelectMode(!selectMode)}
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
        onClick={props.onAdd}
        className="cursor-pointer rounded-[10px] bg-accent px-[18px] py-2.5 font-extrabold text-ground"
      >
        + Add
      </button>
    </header>
  )
}
