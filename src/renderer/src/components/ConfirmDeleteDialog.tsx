interface Props {
  title: string
  year?: number
  onConfirm: () => void
  onCancel: () => void
}

// Asks before deleting. Cancel has the focus, so pressing Enter by accident
// never deletes anything; Esc or a click outside also cancels.
export function ConfirmDeleteDialog({ title, year, onConfirm, onCancel }: Props): React.JSX.Element {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-title"
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
    >
      <div className="flex w-[420px] flex-col gap-4 rounded-2xl border border-line bg-panel p-6">
        <h2 id="delete-title" className="text-xl font-extrabold">
          Delete “{title}”{year ? ` (${year})` : ''}?
        </h2>
        <p className="text-muted">
          This removes it from your library, together with its watch history, rating, notes and image.
          You will be able to undo for a few seconds afterwards.
        </p>
        <div className="flex justify-end gap-3">
          <button type="button" autoFocus onClick={onCancel} className="cursor-pointer rounded-lg border border-edge px-4 py-2">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 font-extrabold text-white">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
