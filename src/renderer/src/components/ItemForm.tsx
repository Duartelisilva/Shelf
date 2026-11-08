import { itemProblems, parsePositiveInt, parseYear } from '../../../shared/rules'
import type { Parsed } from '../../../shared/rules'
import type { MediaItem, Status } from '../../../shared/types'
import { findDuplicate, todayISO, withStatus } from '../lib/edit'
import type { Vocabulary } from '../lib/vocab'
import { CheckedField, NotesField, RatingField, TextField } from './form/fields'
import { DatesField } from './form/DatesField'
import { GenresField } from './form/GenresField'
import { ImageBlock } from './form/ImageBlock'
import { ProgressField } from './form/ProgressField'
import { Segmented, labelClass } from './ui'

interface Props {
  item: MediaItem
  vocabulary: Vocabulary // names used by items of the same type only
  existing: MediaItem[] // the whole library, to refuse a second item with the same title, year and franchise
  onChange: (item: MediaItem) => void
  showProblems: boolean // list what is wrong with the item at the top
  idPrefix: string // keeps the suggestion lists of two open forms apart
}

// Every field of an item. Used by the detail panel (changes save at once) and
// by the Add dialog (changes go to a draft until you press Add). The pieces
// live in ./form; this file only decides which of them an item gets.
export function ItemForm({
  item,
  vocabulary,
  existing,
  onChange,
  showProblems,
  idPrefix
}: Props): React.JSX.Element {
  const set = (patch: Partial<MediaItem>): void => onChange({ ...item, ...patch })
  const text = (value: string): string | undefined => value.trim().replace(/\s+/g, ' ') || undefined
  const key = (name: string, value: unknown): string => `${item.id}-${name}-${String(value ?? '')}`
  const problems = itemProblems(item)

  // Another item with the same type, title, year and franchise, if this change would make one.
  const clash = (patch: Partial<MediaItem>): MediaItem | undefined =>
    findDuplicate(existing, { ...item, ...patch }, item.id)
  const taken = `Already in your library: another ${item.type} with the same title, year and franchise.`

  // A film is seen or not; series and books can be in progress. (A film that
  // somehow has that status still shows it.)
  const doing = item.type === 'book' ? 'Reading' : 'Watching'
  const statuses: { value: Status; label: string }[] = [
    { value: 'wishlist', label: 'Wishlist' },
    ...(item.type !== 'movie' || item.status === 'in-progress'
      ? [{ value: 'in-progress' as Status, label: doing }]
      : []),
    { value: 'finished', label: item.type === 'book' ? 'Read' : 'Seen' }
  ]

  const parseEndYear = (value: string): Parsed<number> => {
    const result = parseYear(value)
    if (result.ok && item.year && result.value < item.year) {
      return { ok: false, error: 'The end year cannot be before the start year.' }
    }
    return result
  }

  return (
    <div className="flex flex-col gap-5">
      {showProblems && problems.length > 0 && (
        <div className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
          {problems.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      )}

      <ImageBlock
        item={item}
        vocabulary={vocabulary}
        wouldClash={(patch) => !!clash(patch)}
        onChange={onChange}
      />

      <div className="flex gap-3">
        <CheckedField
          key={key('title', item.title)}
          label="Title"
          value={item.title}
          autoFocus={idPrefix === 'add'}
          parse={(value) => {
            const title = text(value)
            if (!title) return { ok: false, error: 'A title is required.' }
            return clash({ title }) ? { ok: false, error: taken } : { ok: true, value: title }
          }}
          onCommit={(v) => set({ title: v })}
        />
        <div className="w-24 flex-none">
          <CheckedField
            key={key('year', item.year)}
            label="Year"
            value={item.year === undefined ? '' : String(item.year)}
            parse={(value) => {
              const result = parseYear(value)
              if (!result.ok) return result
              return clash({ year: result.value }) ? { ok: false, error: taken } : result
            }}
            onCommit={(v) => set({ year: v })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className={labelClass}>Status</span>
        <Segmented
          label="Status"
          className="w-full"
          value={item.status}
          options={statuses}
          onChange={(status) => onChange(withStatus(item, status, todayISO()))}
        />
      </div>

      {item.type === 'series' && item.status !== 'finished' && (
        <ProgressField item={item} onChange={onChange} />
      )}

      <RatingField
        key={key('rating', item.rating)}
        value={item.rating}
        onCommit={(v) => set({ rating: v })}
      />

      <GenresField
        item={item}
        known={vocabulary.genres}
        listId={`${idPrefix}-genres`}
        onChange={onChange}
      />

      <div className="flex gap-3">
        <CheckedField
          key={key('franchise', item.franchise)}
          label={item.type === 'book' ? 'Series' : 'Franchise'}
          value={item.franchise ?? ''}
          list={`${idPrefix}-franchises`}
          parse={(value) => {
            const franchise = text(value)
            return clash({ franchise })
              ? { ok: false, error: taken }
              : { ok: true, value: franchise ?? '' }
          }}
          onCommit={(v) => set({ franchise: text(v) })}
        />
        <div className="w-20 flex-none">
          <CheckedField
            key={key('order', item.franchiseOrder)}
            label="Number"
            value={item.franchiseOrder === undefined ? '' : String(item.franchiseOrder)}
            parse={parsePositiveInt}
            onCommit={(v) => set({ franchiseOrder: v })}
            onClear={() => set({ franchiseOrder: undefined })}
          />
        </div>
      </div>
      <datalist id={`${idPrefix}-franchises`}>
        {vocabulary.franchises.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>

      <TextField
        key={key('collection', item.collection)}
        label="Collection"
        value={item.collection ?? ''}
        list={`${idPrefix}-collections`}
        onCommit={(v) => set({ collection: text(v) })}
      />
      <datalist id={`${idPrefix}-collections`}>
        {vocabulary.collections.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {item.type === 'series' && (
        <div className="flex gap-3">
          <CheckedField
            key={key('yearEnd', item.yearEnd)}
            label="Ended"
            value={item.yearEnd === undefined ? '' : String(item.yearEnd)}
            parse={parseEndYear}
            onCommit={(v) => set({ yearEnd: v })}
            onClear={() => set({ yearEnd: undefined })}
          />
          <CheckedField
            key={key('seasons', item.seasons)}
            label="Seasons"
            value={item.seasons === undefined ? '' : String(item.seasons)}
            parse={parsePositiveInt}
            onCommit={(v) => set({ seasons: v })}
            onClear={() => set({ seasons: undefined })}
          />
        </div>
      )}
      {item.type === 'book' && (
        <TextField
          key={key('author', item.author)}
          label="Author"
          value={item.author ?? ''}
          onCommit={(v) => set({ author: text(v) })}
        />
      )}

      <DatesField item={item} onChange={onChange} />

      <NotesField
        key={key('notes', item.notes)}
        value={item.notes ?? ''}
        onCommit={(v) => set({ notes: text(v) })}
      />
    </div>
  )
}
