import type { MediaItem } from '../../../shared/types'
import { addedDate, formatDate, imageUrl, lastDate, posterColor, readableOn } from '../lib/library'

const TYPE_LABEL = { movie: 'Movie', series: 'Series', book: 'Book' } as const

interface Props {
  item: MediaItem
  selected: boolean
  selectMode: boolean
  checked: boolean
  showAdded: boolean
  onPick: (id: string) => void
}

// The card shows the item's image when it has one. Without an image it is a
// colored block with the franchise number, or the first letter.
export function PosterCard({ item, selected, selectMode, checked, showAdded, onPick }: Props): React.JSX.Element {
  const wishlist = item.status === 'wishlist'
  const fill = posterColor(item)
  const ink = wishlist && !item.image ? '#a3acba' : readableOn(fill)
  const seen = lastDate(item)
  const meta = [item.year, showAdded ? `added ${addedDate(item)}` : wishlist ? 'wishlist' : seen ? `seen ${formatDate(seen)}` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <button
      type="button"
      onClick={() => onPick(item.id)}
      aria-pressed={selectMode ? checked : selected}
      className="flex w-[148px] flex-none cursor-pointer flex-col gap-2 text-left"
    >
      <div
        className={[
          'relative flex h-[222px] w-full flex-col justify-between overflow-hidden rounded-[10px] p-3',
          wishlist ? 'border-[1.5px] border-dashed border-edge bg-surface' : '',
          selected || checked ? 'outline-2 outline-offset-[3px] outline-accent' : ''
        ].join(' ')}
        style={wishlist ? undefined : { background: fill }}
      >
        {item.image && (
          <img
            src={imageUrl(item.image)}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="relative flex items-start justify-between">
          <span className="rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-bold text-white uppercase">
            {TYPE_LABEL[item.type]}
          </span>
          {selectMode ? (
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 text-xs font-extrabold ${
                checked ? 'border-accent bg-accent text-ground' : 'border-white/70 bg-black/30'
              }`}
            >
              {checked ? '✓' : ''}
            </span>
          ) : (
            item.isFavorite && (
              <span
                className="rounded-full bg-black/55 px-1.5 text-sm text-white"
                aria-label="Favorite"
              >
                ★
              </span>
            )
          )}
        </div>
        {!item.image && (
          <span className="relative text-[56px] leading-none font-extrabold opacity-40" style={{ color: ink }}>
            {item.franchiseOrder ?? item.title.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div>
        <div className="line-clamp-2 leading-snug font-bold">{item.title}</div>
        <div className="text-xs text-muted">{meta}</div>
      </div>
    </button>
  )
}
