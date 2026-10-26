interface Props {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean // styles the confirm button as a destructive action
  onConfirm: () => void
  onCancel: () => void
}

// Asks before doing something that cannot be taken back easily. Cancel has the
// focus, so pressing Enter by accident never confirms; Esc or a click outside
// also cancels.
export function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onCancel }: Props): React.JSX.Element {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
    >
      <div className="flex w-[440px] flex-col gap-4 rounded-2xl border border-line bg-panel p-6">
        <h2 id="confirm-title" className="text-xl font-extrabold">
          {title}
        </h2>
        <p className="text-muted">{message}</p>
        <div className="flex justify-end gap-3">
          <button type="button" autoFocus onClick={onCancel} className="cursor-pointer rounded-lg border border-edge px-4 py-2">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`cursor-pointer rounded-lg px-4 py-2 font-extrabold ${danger ? 'bg-red-600 text-white' : 'bg-accent text-ground'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
