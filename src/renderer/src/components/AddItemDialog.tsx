import { useState } from 'react'
import { parseDate, parseYear } from '../../../shared/rules'
import type { MediaItem, MediaType } from '../../../shared/types'
import { isDuplicate, todayISO } from '../lib/edit'
import type { Draft } from '../lib/edit'
import { formatDate } from '../lib/library'

interface Props {
  items: MediaItem[]
  onAdd: (draft: Draft) => void
  onClose: () => void
}

const field = 'w-full rounded-lg border border-edge bg-surface px-3 py-2 text-ink'
const label = 'text-xs font-extrabold tracking-wide text-muted uppercase'

// A quick add. The full form (genres, franchise, image...) comes later.
export function AddItemDialog({ items, onAdd, onClose }: Props): React.JSX.Element {
  const [type, setType] = useState<MediaType>('movie')
  const [title, setTitle] = useState('')
  const [year, setYear] = useState('')
  const [status, setStatus] = useState<'wishlist' | 'finished'>('finished')
  const [date, setDate] = useState(formatDate(todayISO()))

  const yearResult = parseYear(year)
  const dateResult = date.trim() ? parseDate(date) : null // an empty date is allowed
  const dateOk = status === 'wishlist' || dateResult === null || dateResult.ok
  const duplicate = !!title.trim() && yearResult.ok && isDuplicate(items, { type, title, year: yearResult.value })
  const canAdd = !!title.trim() && yearResult.ok && dateOk && !duplicate

  const submit = (event: React.FormEvent): void => {
    event.preventDefault()
    if (!canAdd || !yearResult.ok) return
    onAdd({
      type,
      title,
      year: yearResult.value,
      status,
      date: status === 'finished' && dateResult?.ok ? dateResult.value : undefined
    })
  }

  const segment = (active: boolean): string =>
    `flex-1 cursor-pointer px-3 py-2 ${active ? 'bg-accent-soft font-bold text-accent' : 'text-muted'}`

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/60"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <form onSubmit={submit} className="flex w-[420px] flex-col gap-4 rounded-2xl border border-line bg-panel p-6">
        <h2 className="text-xl font-extrabold">Add to Shelf</h2>

        <div className="flex overflow-hidden rounded-[10px] border border-edge">
          {(['movie', 'series', 'book'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)} className={`${segment(type === t)} capitalize`}>
              {t}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1">
          <span className={label}>Title</span>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>Year</span>
          <input value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" placeholder="1999" className={field} />
          {year.trim() !== '' && !yearResult.ok && <span className="text-xs text-red-300">{yearResult.error}</span>}
        </label>

        <div className="flex overflow-hidden rounded-[10px] border border-edge">
          <button type="button" onClick={() => setStatus('finished')} className={segment(status === 'finished')}>
            {type === 'book' ? 'Already read' : 'Already seen'}
          </button>
          <button type="button" onClick={() => setStatus('wishlist')} className={segment(status === 'wishlist')}>
            Wishlist
          </button>
        </div>

        {status === 'finished' && (
          <label className="flex flex-col gap-1">
            <span className={label}>Date (empty if you don&apos;t remember)</span>
            <input value={date} onChange={(e) => setDate(e.target.value)} placeholder="dd/mm/yy" className={field} />
            {dateResult && !dateResult.ok && <span className="text-xs text-red-300">{dateResult.error}</span>}
            {dateResult?.ok && <span className="text-xs text-muted">Will be saved as {formatDate(dateResult.value)}</span>}
          </label>
        )}

        {duplicate && <p className="text-amber-300">This is already in your library.</p>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="cursor-pointer px-3 py-2 text-muted">
            Cancel
          </button>
          <button type="submit" disabled={!canAdd} className="cursor-pointer rounded-lg bg-accent px-5 py-2 font-extrabold text-ground disabled:opacity-40">
            Add
          </button>
        </div>
      </form>
    </div>
  )
}
