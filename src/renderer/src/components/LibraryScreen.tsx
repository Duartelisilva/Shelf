import { useEffect, useMemo, useRef, useState } from 'react'
import { itemProblems } from '../../../shared/rules'
import type { MediaItem } from '../../../shared/types'
import { bulkGenre, cleanGenre, removeItem, replaceItem } from '../lib/edit'
import { SECTION_TITLES, applyFilters, genreOptions, groupItems } from '../lib/library'
import type { GenreFilter, GroupBy, Section, SortBy } from '../lib/library'
import { vocabularies } from '../lib/vocab'
import { BulkBar } from './BulkBar'
import { DetailPanel } from './DetailPanel'
import { ShelfView } from './ShelfView'
import { TopBar } from './TopBar'
import { Button } from './ui'

interface Props {
  items: MediaItem[]
  section: Section
  selectedId: string | null
  onSelect: (id: string | null) => void
  onChange: (items: MediaItem[], undoLabel?: string) => void
  onAdd: () => void
  onOpenSettings: () => void
}

export function LibraryScreen({
  items,
  section,
  selectedId,
  onSelect,
  onChange,
  onAdd,
  onOpenSettings
}: Props): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState<GenreFilter | null>(null)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [groupBy, setGroupBy] = useState<GroupBy>('franchise')
  const [sortBy, setSortBy] = useState<SortBy>('title')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [attentionOnly, setAttentionOnly] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set())
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
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
  // The names used by each type, for suggestions. Types never share them.
  const vocab = useMemo(() => vocabularies(items), [items])
  // A genre picked in one section may not exist in another.
  const activeGenre =
    genre && genres.some((g) => g.type === genre.type && g.name === genre.name) ? genre : null
  const needAttention = useMemo(
    () => items.filter((i) => itemProblems(i).length > 0).length,
    [items]
  )
  const showAttention = attentionOnly && needAttention > 0
  const visible = useMemo(
    () =>
      applyFilters(items, {
        section,
        query,
        genre: activeGenre,
        favoritesOnly,
        attentionOnly: showAttention
      }),
    [items, section, query, activeGenre, favoritesOnly, showAttention]
  )
  const shelves = useMemo(
    () => groupItems(visible, groupBy, { wishlistShelf: section === 'library', sortBy }),
    [visible, groupBy, section, sortBy]
  )
  const selected = items.find((i) => i.id === selectedId) ?? null

  // Shelves fold away by clicking their title. "Collapse all" folds every shelf
  // on screen, or opens them all again when they are all folded.
  const allCollapsed = shelves.length > 0 && shelves.every((s) => collapsed.has(s.id))
  const toggleShelf = (id: string): void => {
    const next = new Set(collapsed)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setCollapsed(next)
  }
  const toggleAll = (): void => {
    const next = new Set(collapsed)
    for (const shelf of shelves) {
      if (allCollapsed) next.delete(shelf.id)
      else next.add(shelf.id)
    }
    setCollapsed(next)
  }

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
  // Genres belong to one type, so a bulk change needs a selection of one type.
  const checkedTypes = useMemo(
    () => new Set(items.filter((i) => checked.has(i.id)).map((i) => i.type)),
    [items, checked]
  )
  const bulkType = checkedTypes.size === 1 ? [...checkedTypes][0] : null
  const bulkBlocked =
    checkedTypes.size > 1
      ? 'Genres are separate for movies, series and books: select one kind at a time.'
      : null
  const applyBulk = (input: string, mode: 'add' | 'remove'): void => {
    if (!bulkType) return
    const known = vocab[bulkType].genres
    const name = cleanGenre(input, known)
    if (!name || checked.size === 0) return
    const verb = mode === 'add' ? `Added “${name}” to` : `Removed “${name}” from`
    onChange(bulkGenre(items, checked, name, mode, known), `${verb} ${checked.size} items`)
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
          sortBy={sortBy}
          onSortBy={setSortBy}
          view={view}
          onView={setView}
          selectMode={selectMode}
          onSelectMode={changeSelectMode}
          onAdd={onAdd}
        />
        <div className="flex flex-1 flex-col gap-8 overflow-y-auto p-7">
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] font-extrabold">{SECTION_TITLES[section]}</h1>
            <span className="text-muted">
              {visible.length === inSection.length
                ? `${visible.length} items`
                : `${visible.length} of ${inSection.length} items`}
            </span>
            <div className="flex-1" />
            {shelves.length > 1 && (
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {allCollapsed ? 'Expand all' : 'Collapse all'}
              </Button>
            )}
          </div>

          {needAttention > 0 && (
            <div className="flex items-center gap-3 rounded-lg bg-warn-soft px-4 py-2.5 text-warn">
              <span>
                {needAttention === 1 ? '1 item has' : `${needAttention} items have`} a missing or
                invalid year or date.
              </span>
              <Button size="sm" onClick={() => setAttentionOnly(!showAttention)}>
                {showAttention ? 'Show everything' : 'Show them'}
              </Button>
            </div>
          )}

          {items.length === 0 ? (
            <div className="flex flex-col items-start gap-3 text-muted">
              <p>Your library is empty.</p>
              <div className="flex gap-3">
                <Button variant="primary" onClick={onAdd}>
                  + Add your first item
                </Button>
                <Button onClick={onOpenSettings}>Import a backup or from V1…</Button>
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
                showAdded={sortBy === 'added'}
                collapsed={collapsed.has(shelf.id)}
                onToggle={() => toggleShelf(shelf.id)}
                onPick={pick}
                onSelectShelf={(ids) => setChecked(new Set([...checked, ...ids]))}
              />
            ))
          )}
        </div>
        {selectMode && (
          <BulkBar
            count={checked.size}
            genres={bulkType ? vocab[bulkType].genres : []}
            blocked={bulkBlocked}
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
          vocabulary={vocab[selected.type]}
          existing={items}
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
