import { useState } from 'react'
import type { MediaItem, MediaType } from '../../../shared/types'
import { namesOf, removeName, renameName } from '../lib/names'
import type { NameKind } from '../lib/names'
import { MEDIA_TYPES, TYPE_PLURAL } from '../lib/vocab'
import { ConfirmDialog } from './ConfirmDialog'
import { Button, Segmented, inputClass } from './ui'

interface Props {
  items: MediaItem[]
  onItemsChange: (items: MediaItem[], undoLabel: string) => void
}

const KINDS: { value: NameKind; label: string }[] = [
  { value: 'genre', label: 'Genres' },
  { value: 'franchise', label: 'Franchises' },
  { value: 'collection', label: 'Collections' }
]

// Rename, merge or remove a genre, franchise or collection on every item at once.
// Each type keeps its own names, so you choose which type you are working on.
export function NamesSection({ items, onItemsChange }: Props): React.JSX.Element {
  const [type, setType] = useState<MediaType>('movie')
  const [kind, setKind] = useState<NameKind>('genre')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const names = namesOf(items, type, kind)
  const kindLabel = KINDS.find((k) => k.value === kind)?.label.toLowerCase() ?? ''
  const mergeTarget = editing
    ? names.find((n) => n.name !== editing && n.name.toLowerCase() === draft.trim().toLowerCase())
    : undefined

  const startEdit = (name: string): void => {
    setEditing(name)
    setDraft(name)
    setError(null)
  }
  const save = (from: string): void => {
    const result = renameName(items, type, kind, from, draft)
    if (!result.ok) return setError(result.error)
    const to = mergeTarget?.name ?? draft.trim()
    onItemsChange(result.items, `Renamed “${from}” to “${to}” on ${result.changed} items`)
    setEditing(null)
  }
  const confirmRemove = (name: string): void => {
    const result = removeName(items, type, kind, name)
    setRemoving(null)
    if (result.ok) onItemsChange(result.items, `Removed “${name}” from ${result.changed} items`)
  }
  const removingCount = removing ? (names.find((n) => n.name === removing)?.count ?? 0) : 0

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      <h2 className="text-base font-extrabold">Genres, franchises and collections</h2>
      <p className="text-muted">
        Rename a name everywhere at once, or give it the name of another one to merge them. Each
        type has its own names.
      </p>
      <div className="flex flex-wrap gap-3">
        <Segmented
          label="Type"
          value={type}
          onChange={(t) => {
            setType(t)
            setEditing(null)
          }}
          options={MEDIA_TYPES.map((t) => ({ value: t, label: TYPE_PLURAL[t] }))}
        />
        <Segmented
          label="Kind of name"
          value={kind}
          onChange={(k) => {
            setKind(k)
            setEditing(null)
          }}
          options={KINDS}
        />
      </div>

      {names.length === 0 ? (
        <p className="text-muted">
          No {kindLabel} for {TYPE_PLURAL[type].toLowerCase()} yet.
        </p>
      ) : (
        <div className="flex flex-col">
          {names.map((n) => (
            <div
              key={n.name}
              className="flex min-h-12 flex-wrap items-center gap-3 border-t border-line py-2"
            >
              {editing === n.name ? (
                <>
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value)
                      setError(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') save(n.name)
                      if (e.key === 'Escape') setEditing(null)
                    }}
                    aria-label={`New name for ${n.name}`}
                    className={`${inputClass} max-w-[320px]`}
                  />
                  <Button variant="primary" onClick={() => save(n.name)}>
                    Save
                  </Button>
                  <Button variant="ghost" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                  {mergeTarget && !error && (
                    <span className="text-sm text-warn">Merges with “{mergeTarget.name}”</span>
                  )}
                  {error && <span className="text-sm text-danger">{error}</span>}
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate font-bold">{n.name}</span>
                  <span className="text-muted">
                    {n.count === 1 ? '1 item' : `${n.count} items`}
                  </span>
                  <Button size="sm" onClick={() => startEdit(n.name)}>
                    Rename
                  </Button>
                  <Button size="sm" variant="dangerGhost" onClick={() => setRemoving(n.name)}>
                    Remove
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {removing && (
        <ConfirmDialog
          title={`Remove “${removing}”?`}
          message={`It will be removed from ${removingCount} ${TYPE_PLURAL[type].toLowerCase()}. You can undo this right afterwards.`}
          confirmLabel="Remove"
          danger
          onConfirm={() => confirmRemove(removing)}
          onCancel={() => setRemoving(null)}
        />
      )}
    </section>
  )
}
