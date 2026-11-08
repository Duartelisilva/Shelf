import { useState } from 'react'
import type { MediaItem } from '../../../../shared/types'
import { addedDate, imageUrl, posterColor, readableOn } from '../../lib/library'
import type { Vocabulary } from '../../lib/vocab'
import { LookupDialog } from '../LookupDialog'
import { Button } from '../ui'

interface Props {
  item: MediaItem
  vocabulary: Vocabulary
  wouldClash: (patch: Partial<MediaItem>) => boolean
  onChange: (item: MediaItem) => void
}

// The picture of the item and the buttons around it: favorite, choose an image
// of your own, look one up online, remove it. All buttons have the same width.
export function ImageBlock({ item, vocabulary, wouldClash, onChange }: Props): React.JSX.Element {
  const [imageError, setImageError] = useState<string | null>(null)
  const [lookupOpen, setLookupOpen] = useState(false)
  const fill = posterColor(item)

  // The app keeps its own copy of the chosen image; the original can be deleted.
  const chooseImage = async (): Promise<void> => {
    setImageError(null)
    const result = await window.api.images.pick(item.id)
    if (!result) return
    if ('error' in result) return setImageError(result.error)
    const old = item.image
    onChange({ ...item, image: result.fileName })
    if (old) void window.api.images.remove(old)
  }
  const removeImage = (): void => {
    const old = item.image
    onChange({ ...item, image: undefined })
    if (old) void window.api.images.remove(old)
  }

  return (
    <>
      <div className="flex gap-4">
        <div
          className="relative flex h-[156px] w-[104px] flex-none items-end overflow-hidden rounded-lg p-2"
          style={{ background: fill, color: readableOn(fill) }}
        >
          {item.image ? (
            <img
              src={imageUrl(item.image)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <span className="text-4xl font-extrabold opacity-40">
              {item.franchiseOrder ?? (item.title.charAt(0).toUpperCase() || '?')}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent uppercase">
              {item.type}
            </span>
            {item.title && (
              <span className="text-xs whitespace-nowrap text-muted">Added {addedDate(item)}</span>
            )}
          </div>
          <Button
            size="sm"
            className="w-full"
            pressed={item.isFavorite}
            onClick={() => onChange({ ...item, isFavorite: !item.isFavorite })}
          >
            {item.isFavorite ? '★ Favorite' : '☆ Favorite'}
          </Button>
          <Button size="sm" className="w-full" onClick={() => void chooseImage()}>
            {item.image ? 'Change image…' : 'Choose image…'}
          </Button>
          <Button size="sm" className="w-full" onClick={() => setLookupOpen(true)}>
            Look up online…
          </Button>
          {item.image && (
            <Button size="sm" variant="ghost" className="w-full" onClick={removeImage}>
              Remove image
            </Button>
          )}
        </div>
      </div>
      {imageError && <p className="text-sm text-danger">{imageError}</p>}
      {lookupOpen && (
        <LookupDialog
          item={item}
          knownGenres={vocabulary.genres}
          wouldClash={wouldClash}
          onApply={onChange}
          onClose={() => setLookupOpen(false)}
        />
      )}
    </>
  )
}
