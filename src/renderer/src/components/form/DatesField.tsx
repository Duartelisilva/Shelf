import { useState } from 'react'
import { parseDate } from '../../../../shared/rules'
import type { MediaItem } from '../../../../shared/types'
import { todayISO, withDate, withoutDate } from '../../lib/edit'
import { formatDate } from '../../lib/library'
import { Button, inputClass, labelClass } from '../ui'

interface Props {
  item: MediaItem
  onChange: (item: MediaItem) => void
}

// When you saw or read it. Dates are typed as dd/mm/yy and shown as dd/mm/yyyy.
export function DatesField({ item, onChange }: Props): React.JSX.Element {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const preview = text.trim() ? parseDate(text) : null

  const add = (): void => {
    const result = parseDate(text)
    if (!result.ok) return setError(result.error)
    onChange(withDate(item, result.value))
    setText('')
    setError(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <span className={labelClass}>{item.type === 'book' ? 'Read history' : 'Watch history'}</span>
      {item.dates.length === 0 && <span className="text-muted">No dates</span>}
      {[...item.dates]
        .sort()
        .reverse()
        .map((d) => (
          <div key={d} className="flex items-center justify-between border-b border-line pb-1.5">
            <span>{formatDate(d)}</span>
            <Button variant="ghost" size="sm" onClick={() => onChange(withoutDate(item, d))}>
              Remove
            </Button>
          </div>
        ))}
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="dd/mm/yy"
          aria-label="New date"
          aria-invalid={!!error}
          className={`${inputClass} ${error ? 'border-danger' : ''}`}
        />
        <Button onClick={add}>Add</Button>
        <Button onClick={() => onChange(withDate(item, todayISO()))}>Today</Button>
      </div>
      {error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : (
        preview?.ok && (
          <span className="text-xs text-muted">Will be saved as {formatDate(preview.value)}</span>
        )
      )}
    </div>
  )
}
