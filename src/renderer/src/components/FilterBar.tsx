import type { MissingField } from '../lib/library'
import { Button, inputClass, labelClass, selectClass } from './ui'

interface Props {
  yearFrom: string
  yearTo: string
  minRating: number | null
  missing: MissingField[]
  canClear: boolean
  onYearFrom: (value: string) => void
  onYearTo: (value: string) => void
  onMinRating: (value: number | null) => void
  onToggleMissing: (field: MissingField) => void
  onClear: () => void
}

const MISSING: { field: MissingField; label: string }[] = [
  { field: 'genre', label: 'No genre' },
  { field: 'image', label: 'No image' },
  { field: 'rating', label: 'No rating' }
]

// The extra filters: a range of years, a minimum rating, and what is missing.
export function FilterBar(props: Props): React.JSX.Element {
  return (
    <div className="flex flex-none flex-wrap items-center gap-x-6 gap-y-3 border-b border-line bg-panel px-7 py-3">
      <div className="flex items-center gap-2">
        <span className={labelClass}>Year</span>
        <input
          value={props.yearFrom}
          onChange={(e) => props.onYearFrom(e.target.value)}
          inputMode="numeric"
          placeholder="from"
          aria-label="Year from"
          className={`${inputClass} w-[88px]`}
        />
        <span className="text-muted">–</span>
        <input
          value={props.yearTo}
          onChange={(e) => props.onYearTo(e.target.value)}
          inputMode="numeric"
          placeholder="to"
          aria-label="Year to"
          className={`${inputClass} w-[88px]`}
        />
      </div>
      <div className="flex items-center gap-2">
        <span className={labelClass}>Rating</span>
        <select
          value={props.minRating === null ? '' : String(props.minRating)}
          onChange={(e) => props.onMinRating(e.target.value === '' ? null : Number(e.target.value))}
          aria-label="Minimum rating"
          className={`${selectClass} w-[110px]`}
        >
          <option value="">Any</option>
          {[5, 6, 7, 8, 9].map((n) => (
            <option key={n} value={n}>
              {n}+
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className={labelClass}>Missing</span>
        {MISSING.map(({ field, label }) => (
          <Button
            key={field}
            pressed={props.missing.includes(field)}
            onClick={() => props.onToggleMissing(field)}
          >
            {label}
          </Button>
        ))}
      </div>
      <Button variant="ghost" disabled={!props.canClear} onClick={props.onClear}>
        Clear filters
      </Button>
    </div>
  )
}
