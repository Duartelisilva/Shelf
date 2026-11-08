import { Modal } from './Modal'
import { Button } from './ui'

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
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onCancel
}: Props): React.JSX.Element {
  return (
    <Modal label={title} onClose={onCancel} widthClass="w-[440px]" alert closeOnBackdrop>
      <h2 className="text-xl font-extrabold">{title}</h2>
      <p className="text-muted">{message}</p>
      <div className="flex justify-end gap-3">
        <Button autoFocus onClick={onCancel}>
          Cancel
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
