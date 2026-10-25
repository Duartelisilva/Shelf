import { useMemo, useState } from 'react'
import type { MediaItem, MediaType } from '../../../shared/types'
import { imageUrl, posterColor } from '../lib/library'
import { computeStats } from '../lib/stats'
import type { Period } from '../lib/stats'

const panel = 'flex min-w-[360px] flex-1 flex-col gap-3.5 rounded-xl border border-line bg-surface p-5'
const heading = 'text-base font-extrabold'
const TYPE_NAME: Record<MediaType, string> = { movie: 'Movies', series: 'Series', book: 'Books' }
const DONE_NAME: Record<MediaType, string> = { movie: 'MOVIES SEEN', series: 'SERIES FINISHED', book: 'BOOKS READ' }

function Thumb({ item }: { item: MediaItem }): React.JSX.Element {
  return (
    <div
      className="relative h-10 w-7 flex-none overflow-hidden rounded-[5px]"
      style={{ background: posterColor(item) }}
    >
      {item.image && <img src={imageUrl(item.image)} alt="" className="absolute inset-0 h-full w-full object-cover" />}
    </div>
  )
}

function Empty({ children }: { children: string }): React.JSX.Element {
  return <p className="text-muted">{children}</p>
}

export function StatsScreen({ items }: { items: MediaItem[] }): React.JSX.Element {
  const [period, setPeriod] = useState<Period>('all')
  const [topType, setTopType] = useState<MediaType>('movie')
  const currentYear = new Date().getFullYear()
  const stats = useMemo(() => computeStats(items, period, currentYear), [items, period, currentYear])

  const total = stats.counts.movie + stats.counts.series + stats.counts.book
  const tallest = Math.max(1, ...stats.perYear.map((y) => y.count))
  const top = stats.topRated[topType]

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="flex items-center gap-3">
        <h1 className="text-[28px] font-extrabold">Stats</h1>
        <div className="flex-1" />
        <select
          value={String(period)}
          onChange={(e) => setPeriod(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          aria-label="Period"
          className="rounded-lg border border-edge bg-surface px-3 py-2"
        >
          <option value="all">All time</option>
          {stats.years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 flex flex-wrap gap-4">
        {(['movie', 'series', 'book'] as const).map((type) => (
          <div key={type} className="min-w-[160px] flex-1 rounded-xl border border-line bg-surface px-5 py-4">
            <div className="text-xs font-extrabold text-muted">{DONE_NAME[type]}</div>
            <div className="mt-1.5 text-[34px] leading-tight font-extrabold">{stats.counts[type]}</div>
            <div className="text-xs text-muted">{stats.thisYear[type]} in {currentYear}</div>
          </div>
        ))}
        <div className="min-w-[160px] flex-1 rounded-xl border border-line bg-surface px-5 py-4">
          <div className="text-xs font-extrabold text-muted">AVERAGE RATING</div>
          <div className="mt-1.5 text-[34px] leading-tight font-extrabold">{stats.averageRating ?? '–'}</div>
          <div className="text-xs text-muted">{stats.ratedCount} rated</div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-5">
        <section className={panel}>
          <div className="flex items-center gap-3">
            <h2 className={heading}>Top rated</h2>
            <div className="flex-1" />
            <div className="flex overflow-hidden rounded-lg border border-edge">
              {(['movie', 'series', 'book'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTopType(type)}
                  aria-pressed={topType === type}
                  className={`cursor-pointer px-3 py-1 ${topType === type ? 'bg-accent-soft font-bold text-accent' : 'text-muted'}`}
                >
                  {TYPE_NAME[type]}
                </button>
              ))}
            </div>
          </div>
          {top.length === 0 ? (
            <Empty>No ratings yet. Rate items in the detail panel and they will show up here.</Empty>
          ) : (
            top.map((item, index) => (
              <div key={item.id} className="flex items-center gap-3">
                <span className="w-4 font-extrabold text-muted">{index + 1}</span>
                <Thumb item={item} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{item.title}</div>
                  <div className="mt-1.5 h-[5px] rounded-sm bg-line">
                    <div className="h-[5px] rounded-sm bg-accent" style={{ width: `${(item.rating ?? 0) * 10}%` }} />
                  </div>
                </div>
                <span className="font-extrabold">{item.rating}</span>
              </div>
            ))
          )}
        </section>

        <section className={panel}>
          <h2 className={heading}>Items finished per year</h2>
          {stats.perYear.length === 0 ? (
            <Empty>No watch or read dates yet.</Empty>
          ) : (
            <div className="flex h-[200px] items-end gap-2.5 border-b border-line">
              {stats.perYear.map((y) => (
                <div key={y.year} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="text-xs font-bold">{y.count}</span>
                  <div className="w-full max-w-11 rounded-t-md bg-accent" style={{ height: `${(y.count / tallest) * 140}px`, minHeight: y.count ? 3 : 0 }} />
                  <span className="text-xs text-muted">{y.year}</span>
                </div>
              ))}
            </div>
          )}
          {stats.undated > 0 && (
            <p className="text-xs text-muted">{stats.undated} finished items have no date, so they are not in this chart.</p>
          )}
        </section>

        <section className={panel}>
          <h2 className={heading}>Most-followed franchises</h2>
          {stats.franchises.length === 0 ? (
            <Empty>Franchises with at least two finished items appear here.</Empty>
          ) : (
            stats.franchises.map((f) => (
              <div key={f.name} className="flex items-center gap-2.5">
                <span className="flex-1 truncate font-bold">{f.name}</span>
                <span className="text-muted">
                  {f.items} items · {f.watches} {f.watches === 1 ? 'watch' : 'watches'}
                </span>
              </div>
            ))
          )}
        </section>

        <section className={panel}>
          <h2 className={heading}>Top genres</h2>
          {stats.genres.length === 0 ? (
            <Empty>Add genres to your items and they will be counted here.</Empty>
          ) : (
            stats.genres.map((g) => (
              <div key={g.name} className="flex items-center gap-3">
                <span className="w-28 truncate font-bold">{g.name}</span>
                <div className="h-[5px] flex-1 rounded-sm bg-line">
                  <div className="h-[5px] rounded-sm bg-accent" style={{ width: `${(g.count / stats.genres[0].count) * 100}%` }} />
                </div>
                <span className="w-8 text-right font-extrabold">{g.count}</span>
              </div>
            ))
          )}
          <p className="text-xs text-muted">An item with several genres counts once in each of them.</p>
        </section>

        <section className={panel}>
          <h2 className={heading}>Most rewatched</h2>
          {stats.mostRewatched.length === 0 ? (
            <Empty>Items you saw or read more than once appear here.</Empty>
          ) : (
            stats.mostRewatched.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <Thumb item={item} />
                <span className="flex-1 truncate font-bold">{item.title}</span>
                <span className="text-muted">{item.dates.length} times</span>
              </div>
            ))
          )}
        </section>

        <section className={panel}>
          <h2 className={heading}>Split by type</h2>
          {total === 0 ? (
            <Empty>Nothing finished yet.</Empty>
          ) : (
            <>
              <div className="flex h-3.5 overflow-hidden rounded-[7px]">
                <div style={{ width: `${(stats.counts.movie / total) * 100}%`, background: '#8aa4ff' }} />
                <div style={{ width: `${(stats.counts.series / total) * 100}%`, background: '#1f9d7f' }} />
                <div style={{ width: `${(stats.counts.book / total) * 100}%`, background: '#d69a3c' }} />
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
                <span>Movies {stats.counts.movie}</span>
                <span>Series {stats.counts.series}</span>
                <span>Books {stats.counts.book}</span>
              </div>
            </>
          )}
          <p className="text-xs text-muted">{stats.wishlist} more on the wishlist, not counted above.</p>
        </section>
      </div>
    </div>
  )
}
