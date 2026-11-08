import { useMemo, useState } from 'react'
import type { MediaItem, MediaType } from '../../../shared/types'
import { formatDate } from '../lib/library'
import { availableYears, monthName, yearReview } from '../lib/periodStats'
import type { TypeSummary } from '../lib/periodStats'
import { MEDIA_TYPES, TYPE_PLURAL } from '../lib/vocab'
import { PeriodBar } from './PeriodBar'
import { PosterThumb } from './PosterThumb'
import { Segmented, headingClass, panelClass, selectClass } from './ui'

const TYPE_VERB: Record<MediaType, string> = {
  movie: 'movies seen',
  series: 'series finished',
  book: 'books read'
}
const TYPE_COLOR: Record<MediaType, string> = {
  movie: 'bg-accent',
  series: 'bg-ok',
  book: 'bg-warn'
}

export function TypeCard({
  type,
  summary
}: {
  type: MediaType
  summary: TypeSummary
}): React.JSX.Element {
  return (
    <div className="min-w-[200px] flex-1 rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center gap-2 text-xs font-extrabold text-muted uppercase">
        <span className={`h-2.5 w-2.5 rounded-full ${TYPE_COLOR[type]}`} />
        {TYPE_VERB[type]}
      </div>
      <div className="mt-1.5 text-[40px] leading-tight font-extrabold">{summary.count}</div>
      <div className="text-sm text-muted">
        {summary.averageRating === null
          ? 'No ratings yet'
          : `Average rating ${summary.averageRating} (${summary.ratedCount} rated)`}
      </div>
      {summary.best && (
        <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
          <PosterThumb item={summary.best} />
          <div className="min-w-0">
            <div className="text-xs text-muted">Best rated</div>
            <div className="truncate font-bold">{summary.best.title}</div>
            <div className="text-sm text-muted">{summary.best.rating} / 10</div>
          </div>
        </div>
      )}
    </div>
  )
}

// What you saw and read in one year, in the spirit of a "wrapped" summary. Years
// start at the year of your first recorded watch and end with the current one.
export function YearReviewScreen({ items }: { items: MediaItem[] }): React.JSX.Element {
  const [today] = useState(() => new Date())
  const years = useMemo(() => availableYears(items, today), [items, today])
  const [chosen, setChosen] = useState(today.getFullYear())
  const [type, setType] = useState<MediaType>('movie')

  const year = years.includes(chosen) ? chosen : years[0]
  const index = years.indexOf(year) // newest first: the next year is the one before it in the list
  const review = useMemo(() => yearReview(items, year), [items, year])
  const tallest = Math.max(1, ...review.perMonth.map((m) => m.total))
  const rows = review.topRated[type]

  return (
    <div className="mt-6 flex flex-col gap-6">
      <PeriodBar
        canPrevious={index < years.length - 1}
        canNext={index > 0}
        onPrevious={() => setChosen(years[index + 1])}
        onNext={() => setChosen(years[index - 1])}
      >
        <select
          value={year}
          onChange={(e) => setChosen(Number(e.target.value))}
          aria-label="Year"
          className={`${selectClass} w-[120px]`}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </PeriodBar>

      <section className="rounded-2xl border border-line bg-gradient-to-br from-accent-soft to-surface p-8">
        <p className="text-sm font-bold tracking-widest text-accent uppercase">Your {year}</p>
        {review.total === 0 ? (
          <p className="mt-3 text-2xl font-extrabold">Nothing recorded for {year}.</p>
        ) : (
          <>
            <p className="mt-2 text-[64px] leading-none font-extrabold">{review.total}</p>
            <p className="mt-2 text-lg">
              things seen or read
              {review.watches > review.total ? `, ${review.watches} times counting rewatches` : ''}
            </p>
            <p className="mt-1 text-muted">
              {MEDIA_TYPES.map(
                (t) => `${review.byType[t].count} ${TYPE_PLURAL[t].toLowerCase()}`
              ).join(' · ')}
              {review.averageRating !== null ? ` · average rating ${review.averageRating}` : ''}
            </p>
          </>
        )}
      </section>

      {review.total > 0 && (
        <>
          <div className="flex flex-wrap gap-4">
            {MEDIA_TYPES.map((t) => (
              <TypeCard key={t} type={t} summary={review.byType[t]} />
            ))}
          </div>

          <section className={panelClass}>
            <div className="flex items-center gap-3">
              <h2 className={headingClass}>Month by month</h2>
              <div className="flex-1" />
              {review.busiestMonth && (
                <span className="text-sm text-muted">
                  Busiest:{' '}
                  <span className="font-bold text-ink">{monthName(review.busiestMonth.month)}</span>{' '}
                  with {review.busiestMonth.count}
                </span>
              )}
            </div>
            <div className="flex h-[210px] items-end gap-2 border-b border-line">
              {review.perMonth.map((m) => (
                <div
                  key={m.month}
                  className="flex flex-1 flex-col items-center justify-end gap-1.5"
                >
                  <span className="text-xs font-bold">{m.total || ''}</span>
                  <div className="flex w-full max-w-10 flex-col-reverse overflow-hidden rounded-t-md">
                    {MEDIA_TYPES.map((t) => (
                      <div
                        key={t}
                        className={TYPE_COLOR[t]}
                        style={{ height: `${(m[t] / tallest) * 150}px` }}
                      />
                    ))}
                  </div>
                  <span
                    className={`text-xs ${m.month === review.busiestMonth?.month ? 'font-bold text-accent' : 'text-muted'}`}
                  >
                    {monthName(m.month).slice(0, 3)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 text-xs text-muted">
              {MEDIA_TYPES.map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${TYPE_COLOR[t]}`} />
                  {TYPE_PLURAL[t]}
                </span>
              ))}
            </div>
          </section>

          <div className="flex items-center gap-3">
            <h2 className={headingClass}>Highlights for</h2>
            <Segmented
              label="Highlights for"
              value={type}
              onChange={setType}
              size="sm"
              options={MEDIA_TYPES.map((t) => ({ value: t, label: TYPE_PLURAL[t] }))}
            />
          </div>
          <div className="flex flex-wrap gap-5">
            <section className={panelClass}>
              <h2 className={headingClass}>Top rated</h2>
              {rows.length === 0 ? (
                <p className="text-muted">No rated {TYPE_PLURAL[type].toLowerCase()} this year.</p>
              ) : (
                rows.map((item, i) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <span className="w-4 font-extrabold text-muted">{i + 1}</span>
                    <PosterThumb item={item} />
                    <span className="min-w-0 flex-1 truncate font-bold">{item.title}</span>
                    <span className="font-extrabold">{item.rating}</span>
                  </div>
                ))
              )}
            </section>

            <section className={panelClass}>
              <h2 className={headingClass}>Top genres</h2>
              {review.genres[type].length === 0 ? (
                <p className="text-muted">No genres yet for these.</p>
              ) : (
                review.genres[type].map((g) => (
                  <div key={g.name} className="flex items-center gap-3">
                    <span className="w-28 truncate font-bold">{g.name}</span>
                    <div className="h-[5px] flex-1 rounded-sm bg-line">
                      <div
                        className="h-[5px] rounded-sm bg-accent"
                        style={{ width: `${(g.count / review.genres[type][0].count) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-extrabold">{g.count}</span>
                  </div>
                ))
              )}
            </section>

            <section className={panelClass}>
              <h2 className={headingClass}>
                {type === 'book' ? 'Series you followed' : 'Franchises you followed'}
              </h2>
              {review.franchises[type].length === 0 ? (
                <p className="text-muted">Groups with at least two items appear here.</p>
              ) : (
                review.franchises[type].map((f) => (
                  <div key={f.name} className="flex items-center gap-2.5">
                    <span className="flex-1 truncate font-bold">{f.name}</span>
                    <span className="text-muted">
                      {f.items} items · {f.watches} {f.watches === 1 ? 'time' : 'times'}
                    </span>
                  </div>
                ))
              )}
            </section>
          </div>

          <div className="flex flex-wrap gap-5">
            <section className={panelClass}>
              <h2 className={headingClass}>First and last of the year</h2>
              {[
                { label: 'First', entry: review.first },
                { label: 'Latest', entry: review.last }
              ].map(({ label, entry }) =>
                entry ? (
                  <div key={label} className="flex items-center gap-3">
                    <PosterThumb item={entry.item} />
                    <div className="min-w-0">
                      <div className="text-xs text-muted">
                        {label} · {formatDate(entry.date)}
                      </div>
                      <div className="truncate font-bold">{entry.item.title}</div>
                    </div>
                  </div>
                ) : null
              )}
            </section>

            <section className={panelClass}>
              <h2 className={headingClass}>Seen more than once</h2>
              {review.mostRewatched.length === 0 ? (
                <p className="text-muted">Nothing was seen or read twice this year.</p>
              ) : (
                review.mostRewatched.map(({ item, times }) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <PosterThumb item={item} />
                    <span className="min-w-0 flex-1 truncate font-bold">{item.title}</span>
                    <span className="text-muted">{times} times</span>
                  </div>
                ))
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}
