import { useEffect, useMemo, useRef, useState } from 'react'
import { itemProblems } from '../../../shared/rules'
import type { MediaItem } from '../../../shared/types'
import { bulkGenre, cleanGenre, distinct, removeItem, replaceItem } from '../lib/edit'
import { SECTION_TITLES, applyFilters, genreOptions, groupItems } from '../lib/library'
import type { GroupBy, Section } from '../lib/library'
import { BulkBar } from './BulkBar'
import { DetailPanel } from './DetailPanel'
import { ShelfView } from './ShelfView'
import { TopBar } from './TopBar'

interface Props {
  items: MediaItem[]
  section: Section
  selectedId: string | null
  onSelect: (id: string | null) => void
  onChange: (items: MediaItem[], undoLabel?: string) => void
  onAdd: () => void
  onImport: () => void
}

export function LibraryScreen({ items, section, selectedId, onSelect, onChange, onAdd, onImport }: Props): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState<string | null>(null)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [groupBy, setGroupBy] = useState<GroupBy>('franchise')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [attentionOnly, setAttentionOnly] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set())
  const searchRef = useRef<HTMLInputElement>(null)

  // Ctrl+F jumps to the search box.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.ctrlKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const inSection = useMemo(
    () => applyFilters(items, { section, query: '', genre: null, favoritesOnly: false }),
    [items, section]
  )
  const genres = useMemo(() => genreOptions(inSection), [inSection])
  const allGenres = useMemo(() => genreOptions(items).map((g) => g.name), [items])
  const franchises = useMemo(() => distinct(items.map((i) => i.franchise)), [items])
  const collections = useMemo(() => distinct(items.map((i) => i.collection)), [items])
  // A genre picked in one section may not exist in another.
  const activeGenre = genre && genres.some((g) => g.name === genre) ? genre : null
  const needAttention = useMemo(() => items.filter((i) => itemProblems(i).length > 0).length, [items])
  const showAttention = attentionOnly && needAttention > 0
  const visible = useMemo(
    () => applyFilters(items, { section, query, genre: activeGenre, favoritesOnly, attentionOnly: showAttention }),
    [items, section, query, activeGenre, favoritesOnly, showAttention]
  )
  const shelves = useMemo(
    () => groupItems(visible, groupBy, { wishlistShelf: section === 'library' }),
    [visible, groupBy, section]
  )
  const selected = items.find((i) => i.id === selectedId) ?? null

  const toggleChecked = (id: string): void => {
    const next = new Set(checked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setChecked(next)
  }
  const pick = (id: string): void => (selectMode ? toggleChecked(id) : onSelect(id))
  const changeSelectMode = (on: boolean): void => {
    setSelectMode(on)
    setChecked(new Set())
  }
  const applyBulk = (input: string, mode: 'add' | 'remove'): void => {
    const name = cleanGenre(input, allGenres)
    if (!name || checked.size === 0) return
    const verb = mode === 'add' ? `Added “${name}” to` : `Removed “${name}” from`
    onChange(bulkGenre(items, checked, name, mode, allGenres), `${verb} ${checked.size} items`)
  }

  return (
    <div className="flex h-full min-w-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          query={query}
          onQuery={setQuery}
          inputRef={searchRef}
          genre={activeGenre}
          genres={genres}
          onGenre={setGenre}
          favoritesOnly={favoritesOnly}
          onFavoritesOnly={setFavoritesOnly}
          groupBy={groupBy}
          onGroupBy={setGroupBy}
          view={view}
          onView={setView}
          selectMode={selectMode}
          onSelectMode={changeSelectMode}
          onAdd={onAdd}
        />
        <div className="flex flex-1 flex-col gap-8 overflow-y-auto p-7">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[28px] font-extrabold">{SECTION_TITLES[section]}</h1>
            <span className="text-muted">
              {visible.length === inSection.length
                ? `${visible.length} items`
                : `${visible.length} of ${inSection.length} items`}
            </span>
          </div>

          {needAttention > 0 && (
            <div className="flex items-center gap-3 rounded-lg bg-amber-900/40 px-4 py-2.5 text-amber-200">
              <span>
                {needAttention === 1 ? '1 item has' : `${needAttention} items have`} a missing or invalid year or date.
              </span>
              <button type="button" onClick={() => setAttentionOnly(!showAttention)} className="cursor-pointer font-bold underline">
                {showAttention ? 'Show everything' : 'Show them'}
              </button>
            </div>
          )}

          {items.length === 0 ? (
            <div className="flex flex-col items-start gap-3 text-muted">
              <p>Your library is empty.</p>
              <div className="flex gap-3">
                <button type="button" onClick={onAdd} className="cursor-pointer rounded-lg bg-accent px-4 py-2 font-bold text-ground">
                  + Add your first item
                </button>
                <button type="button" onClick={onImport} className="cursor-pointer rounded-lg border border-edge px-4 py-2">
                  Import from MediaTracker V1…
                </button>
              </div>
            </div>
          ) : visible.length === 0 ? (
            <p className="text-muted">Nothing matches your search and filters.</p>
          ) : (
            shelves.map((shelf) => (
              <ShelfView
                key={shelf.id}
                shelf={shelf}
                view={view}
                selectedId={selectedId}
                selectMode={selectMode}
                checkedIds={checked}
                onPick={pick}
                onSelectShelf={(ids) => setChecked(new Set([...checked, ...ids]))}
              />
            ))
          )}
        </div>
        {selectMode && (
          <BulkBar
            count={checked.size}
            genres={allGenres}
            onApply={applyBulk}
            onSelectAllVisible={() => setChecked(new Set(visible.map((i) => i.id)))}
            onClear={() => setChecked(new Set())}
            onDone={() => changeSelectMode(false)}
          />
        )}
      </div>

      {selected && !selectMode && (
        <DetailPanel
          key={selected.id}
          item={selected}
          genres={allGenres}
          franchises={franchises}
          collections={collections}
          onChange={(updated) => onChange(replaceItem(items, updated))}
          onDelete={() => {
            onChange(removeItem(items, selected.id), `Deleted “${selected.title}”`)
            onSelect(null)
          }}
          onClose={() => onSelect(null)}
        />
      )}
    </div>
  )
}
