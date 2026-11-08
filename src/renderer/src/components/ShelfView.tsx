import type { Shelf } from '../lib/library'
import { addedDate, formatDate, lastDate, posterColor } from '../lib/library'
import { PosterCard } from './PosterCard'
import { Button } from './ui'

interface Props {
  shelf: Shelf
  view: 'grid' | 'list'
  selectedId: string | null
  selectMode: boolean
  checkedIds: ReadonlySet<string>
  showAdded: boolean
  collapsed: boolean
  onToggle: () => void
  onPick: (id: string) => void
  onSelectShelf: (ids: string[]) => void
}

function Chevron({ open }: { open: boolean }): React.JSX.Element {
  return (
    <svg
      className={`h-4 w-4 flex-none text-muted transition-transform ${open ? 'rotate-90' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

// One shelf. Its whole title row is the button that folds it away or opens it again.
export function ShelfView(props: Props): React.JSX.Element {
  const { shelf, view, selectedId, selectMode, checkedIds, collapsed, onPick } = props
  const accent = shelf.id === 'wishlist' ? '#6b7280' : posterColor(shelf.items[0])
  const count = shelf.items.length

  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex items-center gap-3">
        <h2 className="min-w-0 flex-1">
          <button
            type="button"
            onClick={props.onToggle}
            aria-expanded={!collapsed}
            title={collapsed ? 'Click to open this shelf' : 'Click to fold this shelf away'}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface"
          >
            <Chevron open={!collapsed} />
            <span className="h-5 w-1 flex-none rounded-sm" style={{ background: accent }} />
            <span className="truncate text-lg font-extrabold">{shelf.title}</span>
            {shelf.tag && (
              <span className="flex-none rounded-full border border-edge px-2 py-0.5 text-xs font-normal text-muted">
                {shelf.tag}
              </span>
            )}
            <span className="flex-none text-sm font-normal text-muted">
              {count === 1 ? '1 item' : `${count} items`}
            </span>
          </button>
        </h2>
        {selectMode && (
          <Button size="sm" onClick={() => props.onSelectShelf(shelf.items.map((i) => i.id))}>
            Select this shelf
          </Button>
        )}
      </div>

      {!collapsed && view === 'grid' && (
        <div className="flex flex-wrap gap-5 px-2">
          {shelf.items.map((item) => (
            <PosterCard
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              selectMode={selectMode}
              checked={checkedIds.has(item.id)}
              showAdded={props.showAdded}
              onPick={onPick}
            />
          ))}
        </div>
      )}

      {!collapsed && view === 'list' && (
        <div className="flex flex-col px-2">
          {shelf.items.map((item) => {
            const seen = lastDate(item)
            const on = selectMode ? checkedIds.has(item.id) : item.id === selectedId
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onPick(item.id)}
                className={`grid cursor-pointer grid-cols-[24px_1fr_80px_60px_1fr_100px_100px] gap-4 border-t border-line px-3 py-2 text-left hover:bg-surface ${
                  on ? 'bg-accent-soft' : ''
                }`}
              >
                <span className="text-accent">{selectMode ? (on ? '✓' : '○') : ''}</span>
                <span className="font-bold">{item.title}</span>
                <span className="text-muted capitalize">{item.type}</span>
                <span className="text-muted">{item.year ?? ''}</span>
                <span className="text-muted">{item.genres.join(', ')}</span>
                <span className="text-muted">{seen ? formatDate(seen) : ''}</span>
                <span className="text-muted">{addedDate(item)}</span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
