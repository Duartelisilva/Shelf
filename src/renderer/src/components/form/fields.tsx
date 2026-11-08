import { useState } from 'react'
import type { Parsed } from '../../../../shared/rules'
import { Button, inputClass, labelClass, textareaClass } from '../ui'

// A text box that saves when you leave it or press Enter (not on every key).
// The parent re-creates it with a new key when the saved value changes.
export function TextField(props: {
  label: string
  value: string
  onCommit: (value: string) => void
  list?: string
  autoFocus?: boolean
}): React.JSX.Element {
  const [draft, setDraft] = useState(props.value)
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className={labelClass}>{props.label}</span>
      <input
        autoFocus={props.autoFocus}
        value={draft}
        list={props.list}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== props.value && props.onCommit(draft)}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className={inputClass}
      />
    </label>
  )
}

// Like TextField, but the text must be valid before it is saved. An invalid
// entry stays on screen with the reason; nothing is saved until it is fixed.
export function CheckedField<T>(props: {
  label: string
  value: string
  parse: (text: string) => Parsed<T>
  onCommit: (value: T) => void
  onClear?: () => void // when set, an empty box clears the value
  list?: string
  autoFocus?: boolean
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
      <span className={labelClass}>{props.label}</span>
      <input
        autoFocus={props.autoFocus}
        value={draft}
        list={props.list}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        aria-invalid={!!error}
        className={`${inputClass} ${error ? 'border-danger' : ''}`}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </label>
  )
}

export function NotesField(props: {
  value: string
  onCommit: (value: string) => void
}): React.JSX.Element {
  const [draft, setDraft] = useState(props.value)
  return (
    <label className="flex flex-col gap-1">
      <span className={labelClass}>Notes</span>
      <textarea
        value={draft}
        rows={3}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== props.value && props.onCommit(draft)}
        className={textareaClass}
      />
    </label>
  )
}

export function RatingField(props: {
  value: number | undefined
  onCommit: (value: number | undefined) => void
}): React.JSX.Element {
  const [draft, setDraft] = useState(props.value ?? 0)
  const commit = (): void => {
    if (draft !== (props.value ?? 0)) props.onCommit(draft)
  }
  return (
    <div className="flex flex-col gap-1">
      <div className="flex h-8 items-center justify-between">
        <span className={labelClass}>Rating</span>
        <span className="flex items-center gap-2 font-extrabold">
          {props.value === undefined && draft === 0 ? 'Not rated' : `${draft} / 10`}
          {props.value !== undefined && (
            <Button variant="ghost" size="sm" onClick={() => props.onCommit(undefined)}>
              Clear
            </Button>
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
