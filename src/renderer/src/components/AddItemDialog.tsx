import { useMemo, useState } from 'react'
import { itemProblems } from '../../../shared/rules'
import type { MediaItem, MediaType } from '../../../shared/types'
import { isDuplicate, startingItem, todayISO, withType } from '../lib/edit'
import type { Section } from '../lib/library'
import { MEDIA_TYPES, vocabularies } from '../lib/vocab'
import { ItemForm } from './ItemForm'

interface Props {
  items: MediaItem[]
  section: Section // the tab you are in, so a new item starts as that kind
  onAdd: (item: MediaItem) => void
  onClose: () => void
}

const TYPE_NAME: Record<MediaType, string> = { movie: 'Movie', series: 'Series', book: 'Book' }

// Adds an item with every field available. Nothing exists until you press Add,
// so Cancel leaves the library untouched (and removes an image you picked).
export function AddItemDialog({ items, section, onAdd, onClose }: Props): React.JSX.Element {
  const [draft, setDraft] = useState<MediaItem>(() =>
    startingItem(section, globalThis.crypto.randomUUID(), new Date().toISOString(), todayISO())
  )
  // In the Movies, Series and Books tabs the kind is already known. Anywhere else
  // (Library, Wishlist, Favorites) nothing is assumed: you choose first.
  const [typeChosen, setTypeChosen] = useState(section === 'movie' || section === 'series' || section === 'book')
  const [attempted, setAttempted] = useState(false)

  const vocab = useMemo(() => vocabularies(items)[draft.type], [items, draft.type])

  const duplicate = !!draft.title.trim() && isDuplicate(items, draft)
  const problems = [...(draft.title.trim() ? [] : ['A title is required.']), ...itemProblems(draft)]
  const canAdd = problems.length === 0 && !duplicate

  const cancel = (): void => {
    if (draft.image) void window.api.images.remove(draft.image)
    onClose()
  }
  // The button stays enabled on purpose: pressing it first saves the field you
  // are typing in, then this check runs and lists anything still missing.
  const add = (): void => {
    if (!canAdd) return setAttempted(true)
    onAdd(draft)
  }

  const segment = (active: boolean): string =>
    `flex-1 cursor-pointer px-3 py-2 ${active ? 'bg-accent-soft font-bold text-accent' : 'text-muted'}`

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/60"
      onKeyDown={(e) => e.key === 'Escape' && cancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add to Shelf"
        className="flex max-h-[92vh] w-[520px] flex-col gap-4 overflow-y-auto rounded-2xl border border-line bg-panel p-6"
      >
        <h2 className="text-xl font-extrabold">Add to Shelf</h2>

        {!typeChosen ? (
          <>
            <p className="text-muted">What are you adding?</p>
            <div className="flex gap-3">
              {MEDIA_TYPES.map((t, index) => (
                <button
                  key={t}
                  type="button"
                  autoFocus={index === 0}
                  onClick={() => {
                    setDraft(withType(draft, t))
                    setTypeChosen(true)
                  }}
                  className="flex-1 cursor-pointer rounded-xl border border-edge py-6 text-lg font-bold hover:border-accent hover:text-accent"
                >
                  {TYPE_NAME[t]}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={cancel} className="cursor-pointer px-3 py-2 text-muted">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex overflow-hidden rounded-[10px] border border-edge">
              {MEDIA_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => setDraft(withType(draft, t))} className={segment(draft.type === t)}>
                  {TYPE_NAME[t]}
                </button>
              ))}
            </div>

            <ItemForm item={draft} vocabulary={vocab} onChange={setDraft} showProblems={false} idPrefix="add" />

            {duplicate && <p className="text-warn">This is already in your library.</p>}
            {attempted && problems.length > 0 && (
              <div className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
                <p className="font-bold">Still needed:</p>
                {problems.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button type="button" onClick={cancel} className="cursor-pointer px-3 py-2 text-muted">
                Cancel
              </button>
              <button type="button" onClick={add} className="cursor-pointer rounded-lg bg-accent px-5 py-2 font-extrabold text-on-accent">
                Add to library
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
