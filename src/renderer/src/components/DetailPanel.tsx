import { useState } from 'react'
import type { MediaItem } from '../../../shared/types'
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog'
import type { Vocabulary } from '../lib/vocab'
import { ItemForm } from './ItemForm'

interface Props {
  item: MediaItem
  vocabulary: Vocabulary
  onChange: (item: MediaItem) => void
  onDelete: () => void
  onClose: () => void
}

// The side panel for the selected item. Every change is saved straight away.
export function DetailPanel({
  item,
  vocabulary,
  onChange,
  onDelete,
  onClose
}: Props): React.JSX.Element {
  const [confirmDelete, setConfirmDelete] = useState(false)
  return (
    <aside className="flex w-[340px] flex-none flex-col gap-5 overflow-y-auto border-l border-line bg-panel p-6">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold tracking-wide text-muted uppercase">Details</span>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer text-muted hover:text-ink"
        >
          Close
        </button>
      </div>

      <ItemForm
        item={item}
        vocabulary={vocabulary}
        onChange={onChange}
        showProblems
        idPrefix="edit"
      />

      <div className="mt-2 border-t border-line pt-4">
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="cursor-pointer text-red-300"
        >
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
