import { useMemo, useState } from 'react'
import { itemProblems } from '../../../shared/rules'
import type { MediaItem, MediaType } from '../../../shared/types'
import { findDuplicate, startingItem, todayISO, withType } from '../lib/edit'
import type { Section } from '../lib/library'
import { MEDIA_TYPES, vocabularies } from '../lib/vocab'
import { ItemForm } from './ItemForm'
import { Modal } from './Modal'
import { Button, Segmented } from './ui'

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
  const [typeChosen, setTypeChosen] = useState(
    section === 'movie' || section === 'series' || section === 'book'
  )
  const [attempted, setAttempted] = useState(false)

  const vocab = useMemo(() => vocabularies(items)[draft.type], [items, draft.type])

  const duplicate = !!draft.title.trim() && !!findDuplicate(items, draft)
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

  return (
    <Modal label="Add to Shelf" onClose={cancel} widthClass="w-[540px]">
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
                className="flex h-24 flex-1 cursor-pointer items-center justify-center rounded-xl border border-edge text-lg font-bold hover:border-accent hover:text-accent"
              >
                {TYPE_NAME[t]}
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <>
          <Segmented
            label="Type"
            className="w-full"
            value={draft.type}
            options={MEDIA_TYPES.map((t) => ({ value: t, label: TYPE_NAME[t] }))}
            onChange={(t) => setDraft(withType(draft, t))}
          />

          <ItemForm
            item={draft}
            vocabulary={vocab}
            existing={items}
            onChange={setDraft}
            showProblems={false}
            idPrefix="add"
          />

          {duplicate && (
            <p className="text-warn">
              This is already in your library (same title, year and franchise).
            </p>
          )}
          {attempted && problems.length > 0 && (
            <div className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
              <p className="font-bold">Still needed:</p>
              {problems.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={cancel}>
              Cancel
            </Button>
            <Button variant="primary" onClick={add}>
              Add to library
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}
