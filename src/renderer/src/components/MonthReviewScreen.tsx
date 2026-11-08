import { useMemo, useState } from 'react'
import type { MediaItem } from '../../../shared/types'
import { formatDate } from '../lib/library'
import {
  allMonths,
  availableMonths,
  availableYears,
  calendarWeeks,
  monthName,
  monthReview
} from '../lib/periodStats'
import { MEDIA_TYPES, TYPE_PLURAL } from '../lib/vocab'
import { PeriodBar } from './PeriodBar'
import { PosterThumb } from './PosterThumb'
import { headingClass, panelClass, selectClass } from './ui'
import { TypeCard } from './YearReviewScreen'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// What you saw and read in one month: totals, a calendar and the list day by day.
// Months start at your first recorded watch and end with the current month.
export function MonthReviewScreen({ items }: { items: MediaItem[] }): React.JSX.Element {
  const [today] = useState(() => new Date())
  const months = useMemo(() => allMonths(items, today), [items, today])
  const years = useMemo(() => availableYears(items, today), [items, today])
  const [chosen, setChosen] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 })

  const index = Math.max(
    0,
    months.findIndex((m) => m.year === chosen.year && m.month === chosen.month)
  )
  const { year, month } = months[index] ?? chosen
  const monthsOfYear = availableMonths(items, year, today)
  const review = useMemo(() => monthReview(items, year, month), [items, year, month])
  const weeks = useMemo(() => calendarWeeks(year, month), [year, month])
  const isThisMonth = year === today.getFullYear() && month === today.getMonth() + 1

  // Changing the year keeps the month when it exists in that year, otherwise takes the nearest one.
  const changeYear = (next: number): void => {
    const available = availableMonths(items, next, today)
    setChosen({
      year: next,
      month: available.includes(month) ? month : available[available.length - 1]
    })
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <PeriodBar
        canPrevious={index > 0}
        canNext={index < months.length - 1}
        onPrevious={() => setChosen(months[index - 1])}
        onNext={() => setChosen(months[index + 1])}
      >
        <select
          value={month}
          onChange={(e) => setChosen({ year, month: Number(e.target.value) })}
          aria-label="Month"
          className={`${selectClass} w-[150px]`}
        >
          {monthsOfYear.map((m) => (
            <option key={m} value={m}>
              {monthName(m)}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => changeYear(Number(e.target.value))}
          aria-label="Year"
          className={`${selectClass} w-[110px]`}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </PeriodBar>

      <section className="rounded-2xl border border-line bg-gradient-to-br from-accent-soft to-surface p-8">
        <p className="text-sm font-bold tracking-widest text-accent uppercase">
          {monthName(month)} {year}
        </p>
        {review.total === 0 ? (
          <p className="mt-3 text-2xl font-extrabold">Nothing recorded for this month.</p>
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
        <div className="flex flex-wrap gap-4">
          {MEDIA_TYPES.map((t) => (
            <TypeCard key={t} type={t} summary={review.byType[t]} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-start gap-5">
        <section className={`${panelClass} flex-none`}>
          <h2 className={headingClass}>Calendar</h2>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((d) => (
              <div key={d} className="w-12 text-center text-xs font-bold text-muted">
                {d}
              </div>
            ))}
            {weeks.flat().map((day, i) => {
              const entries = day ? (review.days[day] ?? []) : []
              const todayCell = isThisMonth && day === today.getDate()
              return (
                <div
                  key={i}
                  title={entries.map((e) => e.item.title).join('\n')}
                  className={`flex h-12 w-12 flex-col items-center justify-center rounded-lg text-sm ${
                    day === null
                      ? ''
                      : entries.length > 0
                        ? 'bg-accent-soft font-bold text-accent'
                        : 'text-muted'
                  } ${todayCell ? 'outline-2 -outline-offset-2 outline-accent' : ''}`}
                >
                  {day}
                  {entries.length > 0 && (
                    <span className="text-[11px] leading-none">{entries.length}</span>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <section className={panelClass}>
          <h2 className={headingClass}>Day by day</h2>
          {review.entries.length === 0 ? (
            <p className="text-muted">Nothing was seen or read in {monthName(month)}.</p>
          ) : (
            review.entries.map((entry, i) => (
              <div
                key={`${entry.item.id}-${entry.date}-${i}`}
                className="flex items-center gap-3 border-t border-line pt-3 first:border-t-0 first:pt-0"
              >
                <span className="w-12 text-sm text-muted">
                  {formatDate(entry.date).slice(0, 5)}
                </span>
                <PosterThumb item={entry.item} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{entry.item.title}</div>
                  <div className="text-xs text-muted capitalize">{entry.item.type}</div>
                </div>
                <span className="font-extrabold">
                  {entry.item.rating === undefined ? '–' : `★ ${entry.item.rating}`}
                </span>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  )
}
