import { useState } from 'react'
import { Button, inputClass } from './ui'

interface Props {
  count: number
  genres: string[] // suggestions for the type that is selected
  blocked: string | null // why genres cannot be changed right now
  onApply: (genre: string, mode: 'add' | 'remove') => void
  onSelectAllVisible: () => void
  onClear: () => void
  onDone: () => void
}

// Shown while selecting several items: set or remove a genre on all of them.
export function BulkBar({
  count,
  genres,
  blocked,
  onApply,
  onSelectAllVisible,
  onClear,
  onDone
}: Props): React.JSX.Element {
  const [genre, setGenre] = useState('')
  const apply = (mode: 'add' | 'remove'): void => {
    if (!genre.trim() || blocked) return
    onApply(genre, mode)
    setGenre('')
  }
  const cannot = !count || !genre.trim() || !!blocked
  return (
    <div className="flex flex-none flex-wrap items-center gap-3 border-t border-line bg-panel px-7 py-3">
      <span className="font-bold">
        {count === 0 ? 'Tick items, then set a genre for all of them' : `${count} selected`}
      </span>
      {blocked && <span className="text-warn">{blocked}</span>}
      <Button variant="ghost" onClick={onSelectAllVisible}>
        Select all shown
      </Button>
      <Button variant="ghost" onClick={onClear}>
        Clear
      </Button>
      <div className="min-w-0 flex-1" />
      <input
        list="bulk-genres"
        value={genre}
        onChange={(e) => setGenre(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && apply('add')}
        placeholder="Genre, e.g. Horror"
        aria-label="Genre to add or remove"
        className={`${inputClass} w-[220px]`}
      />
      <datalist id="bulk-genres">
        {genres.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
      <Button variant="primary" disabled={cannot} onClick={() => apply('add')}>
        Add genre
      </Button>
      <Button disabled={cannot} onClick={() => apply('remove')}>
        Remove genre
      </Button>
      <Button onClick={onDone}>Done</Button>
    </div>
  )
}
