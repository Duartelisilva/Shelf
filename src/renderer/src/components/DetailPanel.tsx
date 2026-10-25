import { useState } from 'react'
import type { Parsed } from '../../../shared/rules'
import { itemProblems, parseDate, parsePositiveInt, parseYear } from '../../../shared/rules'
import type { MediaItem, Status } from '../../../shared/types'
import {
  cleanGenre,
  todayISO,
  withDate,
  withGenre,
  withoutDate,
  withoutGenre,
  withStatus
} from '../lib/edit'
import { addedDate, formatDate, imageUrl, posterColor, readableOn } from '../lib/library'
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog'

interface Props {
  item: MediaItem
  genres: string[]
  franchises: string[]
  collections: string[]
  onChange: (item: MediaItem) => void
  onDelete: () => void
  onClose: () => void
}

const label = 'text-xs font-extrabold tracking-wide text-muted uppercase'
const input = 'w-full rounded-lg border border-edge bg-surface px-3 py-2 text-ink'

// A text box that saves when you leave it or press Enter (not on every key).
// The parent re-creates it with a new key when the saved value changes.
function TextField(props: {
  label: string
  value: string
  onCommit: (value: string) => void
  list?: string
}): React.JSX.Element {
  const [draft, setDraft] = useState(props.value)
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className={label}>{props.label}</span>
      <input
        value={draft}
        list={props.list}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== props.value && props.onCommit(draft)}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className={input}
      />
    </label>
  )
}

// Like TextField, but the text must be valid before it is saved. An invalid
// entry stays on screen with the reason; nothing is saved until it is fixed.
function CheckedField<T>(props: {
  label: string
  value: string
  parse: (text: string) => Parsed<T>
  onCommit: (value: T) => void
  onClear?: () => void // when set, an empty box clears the value
}): React.JSX.Element {
  const [draft, setDraft] = useState(props.value)
  const [error, setError] = useState<string | null>(null)
  const commit = (): void => {
    if (draft === props.value) return setError(null)
    if (draft.trim() === '' && props.onClear) {
      setError(null)
      return props.onClear()
    }
    const result = props.parse(draft)
    if (result.ok) {
      setError(null)
      props.onCommit(result.value)
    } else setError(result.error)
  }
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className={label}>{props.label}</span>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        aria-invalid={!!error}
        className={`${input} ${error ? 'border-red-400' : ''}`}
      />
      {error && <span className="text-xs text-red-300">{error}</span>}
    </label>
  )
}

function NotesField(props: { value: string; onCommit: (value: string) => void }): React.JSX.Element {
  const [draft, setDraft] = useState(props.value)
  return (
    <label className="flex flex-col gap-1">
      <span className={label}>Notes</span>
      <textarea
        value={draft}
        rows={3}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== props.value && props.onCommit(draft)}
        className={input}
      />
    </label>
  )
}

function RatingField(props: { value: number | undefined; onCommit: (value: number | undefined) => void }): React.JSX.Element {
  const [draft, setDraft] = useState(props.value ?? 0)
  const commit = (): void => {
    if (draft !== (props.value ?? 0)) props.onCommit(draft)
  }
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between">
        <span className={label}>Rating</span>
        <span className="font-extrabold">
          {props.value === undefined && draft === 0 ? 'Not rated' : `${draft} / 10`}
          {props.value !== undefined && (
            <button type="button" onClick={() => props.onCommit(undefined)} className="ml-3 cursor-pointer text-sm font-normal text-accent">
              Clear
            </button>
          )}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={0.5}
        value={draft}
        onChange={(e) => setDraft(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        aria-label="Rating"
        className="accent-accent"
      />
    </div>
  )
}

export function DetailPanel({ item, genres, franchises, collections, onChange, onDelete, onClose }: Props): React.JSX.Element {
  const [newGenre, setNewGenre] = useState('')
  const [dateText, setDateText] = useState('')
  const [dateError, setDateError] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const set = (patch: Partial<MediaItem>): void => onChange({ ...item, ...patch })
  const text = (value: string): string | undefined => value.trim().replace(/\s+/g, ' ') || undefined
  const key = (name: string, value: unknown): string => `${item.id}-${name}-${String(value ?? '')}`

  const fill = posterColor(item)
  const problems = itemProblems(item)
  const finishedLabel = item.type === 'book' ? 'Read' : 'Seen'
  const statuses: [Status, string][] = [
    ['wishlist', 'Wishlist'],
    ['in-progress', 'In progress'],
    ['finished', finishedLabel]
  ]

  const addGenre = (): void => {
    if (newGenre.trim()) onChange(withGenre(item, cleanGenre(newGenre, genres), genres))
    setNewGenre('')
  }

  const addDate = (): void => {
    const result = parseDate(dateText)
    if (!result.ok) return setDateError(result.error)
    onChange(withDate(item, result.value))
    setDateText('')
    setDateError(null)
  }
  const datePreview = dateText.trim() ? parseDate(dateText) : null

  // The app keeps its own copy of the chosen image; the original can be deleted.
  const chooseImage = async (): Promise<void> => {
    setImageError(null)
    const result = await window.api.images.pick(item.id)
    if (!result) return
    if ('error' in result) return setImageError(result.error)
    const old = item.image
    onChange({ ...item, image: result.fileName })
    if (old) void window.api.images.remove(old)
  }
  const removeImage = (): void => {
    const old = item.image
    onChange({ ...item, image: undefined })
    if (old) void window.api.images.remove(old)
  }

  const parseEndYear = (value: string): Parsed<number> => {
    const result = parseYear(value)
    if (result.ok && item.year && result.value < item.year) {
      return { ok: false, error: 'The end year cannot be before the start year.' }
    }
    return result
  }

  return (
    <aside className="flex w-[340px] flex-none flex-col gap-5 overflow-y-auto border-l border-line bg-panel p-6">
      <div className="flex items-center justify-between">
        <span className={label}>Details</span>
        <button type="button" onClick={onClose} className="cursor-pointer text-muted hover:text-ink">
          Close
        </button>
      </div>

      {problems.length > 0 && (
        <div className="rounded-lg bg-red-900/40 p-3 text-sm text-red-200">
          {problems.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      )}

      <div className="flex gap-4">
        <div
          className="relative flex h-[165px] w-[110px] flex-none items-end overflow-hidden rounded-lg p-2"
          style={{ background: fill, color: readableOn(fill) }}
        >
          {item.image ? (
            <img src={imageUrl(item.image)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span className="text-4xl font-extrabold opacity-40">{item.franchiseOrder ?? item.title.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex flex-col justify-center gap-2">
          <span className="text-muted">
            <span className="capitalize">{item.type}</span> · added {addedDate(item)}
          </span>
          <button
            type="button"
            onClick={() => set({ isFavorite: !item.isFavorite })}
            aria-pressed={item.isFavorite}
            className={`cursor-pointer self-start rounded-full border px-3 py-1 ${
              item.isFavorite ? 'border-transparent bg-accent-soft font-bold text-accent' : 'border-edge text-muted'
            }`}
          >
            {item.isFavorite ? '★ Favorite' : '☆ Favorite'}
          </button>
          <button type="button" onClick={chooseImage} className="cursor-pointer self-start rounded-lg border border-edge px-3 py-1.5 text-accent">
            {item.image ? 'Change image…' : 'Choose image…'}
          </button>
          {item.image && (
            <button type="button" onClick={removeImage} className="cursor-pointer self-start text-muted hover:text-ink">
              Remove image
            </button>
          )}
        </div>
      </div>
      {imageError && <p className="text-sm text-red-300">{imageError}</p>}

      <div className="flex gap-3">
        <TextField key={key('title', item.title)} label="Title" value={item.title} onCommit={(v) => text(v) && set({ title: text(v)! })} />
        <div className="w-24 flex-none">
          <CheckedField
            key={key('year', item.year)}
            label="Year"
            value={item.year === undefined ? '' : String(item.year)}
            parse={parseYear}
            onCommit={(v) => set({ year: v })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className={label}>Status</span>
        <div className="flex overflow-hidden rounded-[10px] border border-edge">
          {statuses.map(([status, name]) => (
            <button
              key={status}
              type="button"
              onClick={() => onChange(withStatus(item, status, todayISO()))}
              aria-pressed={item.status === status}
              className={`flex-1 cursor-pointer px-2 py-2 ${
                item.status === status ? 'bg-accent-soft font-bold text-accent' : 'text-muted'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <RatingField key={key('rating', item.rating)} value={item.rating} onCommit={(v) => set({ rating: v })} />

      <div className="flex flex-col gap-2">
        <span className={label}>Genres</span>
        <div className="flex flex-wrap gap-2">
          {item.genres.length === 0 && <span className="text-muted">None yet</span>}
          {item.genres.map((g) => (
            <span key={g} className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft py-1 pr-2 pl-3 text-accent">
              {g}
              <button type="button" aria-label={`Remove ${g}`} onClick={() => onChange(withoutGenre(item, g))} className="cursor-pointer">
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          list="genre-options"
          value={newGenre}
          onChange={(e) => setNewGenre(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addGenre()}
          onBlur={addGenre}
          placeholder="Add a genre, press Enter"
          aria-label="Add a genre"
          className={input}
        />
        <datalist id="genre-options">
          {genres.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
      </div>

      {(item.type === 'movie' || item.type === 'book') && (
        <div className="flex gap-3">
          <TextField key={key('franchise', item.franchise)} label={item.type === 'book' ? 'Series' : 'Franchise'} value={item.franchise ?? ''} list="franchise-options" onCommit={(v) => set({ franchise: text(v) })} />
          <div className="w-20 flex-none">
            <CheckedField
              key={key('order', item.franchiseOrder)}
              label="Number"
              value={item.franchiseOrder === undefined ? '' : String(item.franchiseOrder)}
              parse={parsePositiveInt}
              onCommit={(v) => set({ franchiseOrder: v })}
              onClear={() => set({ franchiseOrder: undefined })}
            />
          </div>
        </div>
      )}
      <datalist id="franchise-options">
        {franchises.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>

      <TextField key={key('collection', item.collection)} label="Collection" value={item.collection ?? ''} list="collection-options" onCommit={(v) => set({ collection: text(v) })} />
      <datalist id="collection-options">
        {collections.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {item.type === 'series' && (
        <div className="flex gap-3">
          <CheckedField
            key={key('yearEnd', item.yearEnd)}
            label="Ended"
            value={item.yearEnd === undefined ? '' : String(item.yearEnd)}
            parse={parseEndYear}
            onCommit={(v) => set({ yearEnd: v })}
            onClear={() => set({ yearEnd: undefined })}
          />
          <CheckedField
            key={key('seasons', item.seasons)}
            label="Seasons"
            value={item.seasons === undefined ? '' : String(item.seasons)}
            parse={parsePositiveInt}
            onCommit={(v) => set({ seasons: v })}
            onClear={() => set({ seasons: undefined })}
          />
        </div>
      )}
      {item.type === 'book' && (
        <TextField key={key('author', item.author)} label="Author" value={item.author ?? ''} onCommit={(v) => set({ author: text(v) })} />
      )}

      <div className="flex flex-col gap-2">
        <span className={label}>{item.type === 'book' ? 'Read history' : 'Watch history'}</span>
        {item.dates.length === 0 && <span className="text-muted">No dates</span>}
        {[...item.dates].sort().reverse().map((d) => (
          <div key={d} className="flex justify-between border-b border-line py-1.5">
            <span>{formatDate(d)}</span>
            <button type="button" onClick={() => onChange(withoutDate(item, d))} className="cursor-pointer text-muted hover:text-ink">
              Remove
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            value={dateText}
            onChange={(e) => {
              setDateText(e.target.value)
              setDateError(null)
            }}
            onKeyDown={(e) => e.key === 'Enter' && addDate()}
            placeholder="dd/mm/yy"
            aria-label="New date"
            aria-invalid={!!dateError}
            className={`${input} ${dateError ? 'border-red-400' : ''}`}
          />
          <button type="button" onClick={addDate} className="cursor-pointer rounded-lg border border-edge px-3 text-accent">
            Add
          </button>
          <button type="button" onClick={() => onChange(withDate(item, todayISO()))} className="cursor-pointer rounded-lg border border-edge px-3 text-muted">
            Today
          </button>
        </div>
        {dateError ? (
          <span className="text-xs text-red-300">{dateError}</span>
        ) : (
          datePreview?.ok && <span className="text-xs text-muted">Will be saved as {formatDate(datePreview.value)}</span>
        )}
      </div>

      <NotesField key={key('notes', item.notes)} value={item.notes ?? ''} onCommit={(v) => set({ notes: text(v) })} />

      <div className="mt-2 border-t border-line pt-4">
        <button type="button" onClick={() => setConfirmDelete(true)} className="cursor-pointer text-red-300">
          Delete…
        </button>
      </div>
      {confirmDelete && (
        <ConfirmDeleteDialog
          title={item.title}
          year={item.year}
          onConfirm={onDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </aside>
  )
}
