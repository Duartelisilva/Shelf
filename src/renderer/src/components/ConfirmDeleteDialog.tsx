import { ConfirmDialog } from './ConfirmDialog'

interface Props {
  title: string
  year?: number
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDeleteDialog({ title, year, onConfirm, onCancel }: Props): React.JSX.Element {
  return (
    <ConfirmDialog
      title={`Delete “${title}”${year ? ` (${year})` : ''}?`}
      message="This removes it from your library, together with its watch history, rating, notes and image. You will be able to undo for a few seconds afterwards."
      confirmLabel="Delete"
      danger
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
