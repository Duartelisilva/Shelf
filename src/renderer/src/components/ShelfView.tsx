import { useState } from 'react'
import type { Shelf } from '../lib/library'
import { formatDate, lastDate, posterColor } from '../lib/library'
import { PosterCard } from './PosterCard'

interface Props {
  shelf: Shelf
  view: 'grid' | 'list'
  selectedId: string | null
  selectMode: boolean
  checkedIds: ReadonlySet<string>
  onPick: (id: string) => void
  onSelectShelf: (ids: string[]) => void
}

export function ShelfView(props: Props): React.JSX.Element {
  const { shelf, view, selectedId, selectMode, checkedIds, onPick } = props
  const [collapsed, setCollapsed] = useState(false)
  const accent = shelf.id === 'wishlist' ? '#6b7280' : posterColor(shelf.items[0])
  const count = shelf.items.length

  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex items-center gap-2.5">
        <span className="h-5 w-1 rounded-sm" style={{ background: accent }} />
        <h2 className="text-lg font-extrabold">{shelf.title}</h2>
        <span className="text-muted">{count === 1 ? '1 item' : `${count} items`}</span>
        <div className="flex-1" />
        {selectMode && (
          <button
            type="button"
            onClick={() => props.onSelectShelf(shelf.items.map((i) => i.id))}
            className="cursor-pointer text-accent"
          >
            Select this shelf
          </button>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="cursor-pointer text-muted hover:text-ink"
        >
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>

      {!collapsed && view === 'grid' && (
        <div className="flex flex-wrap gap-5">
          {shelf.items.map((item) => (
            <PosterCard
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              selectMode={selectMode}
              checked={checkedIds.has(item.id)}
              onPick={onPick}
            />
          ))}
        </div>
      )}

      {!collapsed && view === 'list' && (
        <div className="flex flex-col">
          {shelf.items.map((item) => {
            const seen = lastDate(item)
            const on = selectMode ? checkedIds.has(item.id) : item.id === selectedId
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onPick(item.id)}
                className={`grid cursor-pointer grid-cols-[24px_1fr_80px_60px_1fr_100px] gap-4 border-t border-line px-3 py-2 text-left hover:bg-surface ${
                  on ? 'bg-accent-soft' : ''
                }`}
              >
                <span className="text-accent">{selectMode ? (on ? '✓' : '○') : ''}</span>
                <span className="font-bold">{item.title}</span>
                <span className="text-muted capitalize">{item.type}</span>
                <span className="text-muted">{item.year ?? ''}</span>
                <span className="text-muted">{item.genres.join(', ')}</span>
                <span className="text-muted">{seen ? formatDate(seen) : ''}</span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
