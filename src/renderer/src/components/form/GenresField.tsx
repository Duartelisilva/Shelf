import { useState } from 'react'
import type { MediaItem } from '../../../../shared/types'
import { cleanGenre, withGenre, withoutGenre } from '../../lib/edit'
import { inputClass, labelClass } from '../ui'

interface Props {
  item: MediaItem
  known: string[] // genres already used by items of the same type
  listId: string
  onChange: (item: MediaItem) => void
}

export function GenresField({ item, known, listId, onChange }: Props): React.JSX.Element {
  const [draft, setDraft] = useState('')
  const add = (): void => {
    if (draft.trim()) onChange(withGenre(item, cleanGenre(draft, known), known))
    setDraft('')
  }
  return (
    <div className="flex flex-col gap-2">
      <span className={labelClass}>Genres</span>
      <div className="flex flex-wrap gap-2">
        {item.genres.length === 0 && <span className="text-muted">None yet</span>}
        {item.genres.map((g) => (
          <span
            key={g}
            className="inline-flex h-8 items-center gap-1 rounded-full bg-accent-soft pr-1 pl-3 text-sm text-accent"
          >
            {g}
            <button
              type="button"
              aria-label={`Remove ${g}`}
              onClick={() => onChange(withoutGenre(item, g))}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full hover:bg-edge"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        list={listId}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        onBlur={add}
        placeholder="Add a genre, press Enter"
        aria-label="Add a genre"
        className={inputClass}
      />
      <datalist id={listId}>
        {known.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
    </div>
  )
}
