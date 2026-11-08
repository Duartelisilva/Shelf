import type { MediaItem } from '../../../shared/types'
import { imageUrl, posterColor } from '../lib/library'

// A small poster: the item's image, or its colour while it has none.
export function PosterThumb({
  item,
  size = 'sm'
}: {
  item: MediaItem
  size?: 'sm' | 'md'
}): React.JSX.Element {
  return (
    <div
      className={`relative flex-none overflow-hidden rounded-[5px] ${size === 'sm' ? 'h-10 w-7' : 'h-[60px] w-10'}`}
      style={{ background: posterColor(item) }}
    >
      {item.image && (
        <img
          src={imageUrl(item.image)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  )
}
