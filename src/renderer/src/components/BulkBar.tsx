import { useState } from 'react'

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
  const button =
    'cursor-pointer rounded-lg border border-edge px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <div className="flex flex-none flex-wrap items-center gap-3 border-t border-line bg-panel px-7 py-3">
      <span className="font-bold">
        {count === 0 ? 'Tick items, then set a genre for all of them' : `${count} selected`}
      </span>
      {blocked && <span className="text-amber-300">{blocked}</span>}
      <button type="button" onClick={onSelectAllVisible} className={`${button} text-muted`}>
        Select all shown
      </button>
      <button type="button" onClick={onClear} className={`${button} text-muted`}>
        Clear
      </button>
      <div className="flex-1" />
      <input
        list="bulk-genres"
        value={genre}
        onChange={(e) => setGenre(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && apply('add')}
        placeholder="Genre, e.g. Horror"
        aria-label="Genre to add or remove"
        className="rounded-lg border border-edge bg-surface px-3 py-2"
      />
      <datalist id="bulk-genres">
        {genres.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
      <button
        type="button"
        disabled={!count || !genre.trim() || !!blocked}
        onClick={() => apply('add')}
        className={`${button} bg-accent font-bold text-ground`}
      >
        Add genre
      </button>
      <button
        type="button"
        disabled={!count || !genre.trim() || !!blocked}
        onClick={() => apply('remove')}
        className={`${button} text-muted`}
      >
        Remove genre
      </button>
      <button type="button" onClick={onDone} className={`${button} text-accent`}>
        Done
      </button>
    </div>
  )
}
