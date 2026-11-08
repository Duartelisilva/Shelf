import { parsePositiveInt, parseSeasonNumber } from '../../../../shared/rules'
import type { MediaItem } from '../../../../shared/types'
import { nextEpisode, nextSeason, startWatching, withProgress } from '../../lib/edit'
import { Button, labelClass } from '../ui'
import { CheckedField } from './fields'

interface Props {
  item: MediaItem
  onChange: (item: MediaItem) => void
}

// Where a series is up to: season, episode, and quick steps forward.
export function ProgressField({ item, onChange }: Props): React.JSX.Element {
  const p = item.progress
  return (
    <div className="flex flex-col gap-2">
      <span className={labelClass}>Progress</span>
      {p ? (
        <>
          <div className="flex gap-3">
            <CheckedField
              key={`season-${p.season}`}
              label="Season"
              value={String(p.season)}
              parse={(text) => parseSeasonNumber(text, item.seasons)}
              onCommit={(v) => onChange(withProgress(item, v, p.episode))}
            />
            <CheckedField
              key={`episode-${p.episode}`}
              label="Episode"
              value={String(p.episode)}
              parse={parsePositiveInt}
              onCommit={(v) => onChange(withProgress(item, p.season, v))}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onChange(nextEpisode(item))}>
              +1 episode
            </Button>
            <Button size="sm" onClick={() => onChange(nextSeason(item))}>
              Next season
            </Button>
          </div>
        </>
      ) : (
        <div>
          <Button size="sm" onClick={() => onChange(startWatching(item))}>
            Start watching (S1 E1)
          </Button>
        </div>
      )}
    </div>
  )
}
