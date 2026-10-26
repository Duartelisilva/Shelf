import { useState } from 'react'
import type { ImportSummary, V1Scan } from '../../../shared/api'
import type { SagaKind } from '../../../shared/importV1'
import type { Library } from '../../../shared/types'

interface Props {
  onImported: (library: Library) => void
}

// First-time setup only: bring in the files of the old MediaTracker. Once your
// data is in Shelf, export and import (above) are what you use.
export function ImportPanel({ onImported }: Props): React.JSX.Element {
  const [scan, setScan] = useState<V1Scan | null>(null)
  const [kinds, setKinds] = useState<Record<string, SagaKind>>({})
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pickFolder = async (): Promise<void> => {
    setError(null)
    setSummary(null)
    try {
      const result = await window.api.importV1.pickFolder()
      if (result) {
        setScan(result)
        setKinds({})
      }
    } catch (e) {
      setError(String(e))
    }
  }

  const runImport = async (): Promise<void> => {
    setError(null)
    try {
      const result = await window.api.importV1.commit(kinds)
      setSummary(result)
      onImported(result.library)
      setScan(null)
    } catch (e) {
      setError(String(e))
    }
  }

  const sagaValues = scan ? Object.entries(scan.sagaCounts).sort((a, b) => b[1] - a[1]) : []
  const primary = 'cursor-pointer rounded-lg bg-accent px-4 py-2 font-bold text-ground disabled:opacity-40'

  return (
    <details className="rounded-xl border border-line bg-surface p-5">
      <summary className="cursor-pointer text-base font-extrabold">First-time setup: import from MediaTracker V1</summary>
      <div className="mt-4 flex flex-col gap-4">
        <p className="text-muted">
          Pick the folder that holds your old files (movies.json, seriess.json, bookss.json,
          wishlists.json). Items already in Shelf are skipped.
        </p>
        {error && <p className="rounded-lg bg-red-900/40 p-3 text-red-200">{error}</p>}
        <div>
          <button type="button" onClick={pickFolder} className={primary}>
            Choose folder…
          </button>
        </div>

        {scan && (
          <div className="flex flex-col gap-2 rounded-lg border border-line p-4">
            <p>
              Found: {scan.found.length ? scan.found.join(', ') : 'nothing'}
              {scan.missing.length > 0 && <span className="text-muted"> · not found: {scan.missing.join(', ')}</span>}
            </p>
            {scan.problems.map((p) => (
              <p key={p} className="text-red-300">
                {p}
              </p>
            ))}
            <p className="text-muted">
              {scan.counts.movies} movies, {scan.counts.series} series, {scan.counts.books} books, {scan.counts.wishlist} on the wishlist
            </p>

            {sagaValues.length > 0 && (
              <>
                <h3 className="mt-3 font-bold">What are these old &quot;Saga&quot; values?</h3>
                <p className="text-sm text-muted">Genres describe what a movie is (Horror). Collections group films (Marvel).</p>
                <div className="mt-1 grid max-w-md grid-cols-[1fr_auto] gap-x-4 gap-y-2">
                  {sagaValues.map(([value, count]) => (
                    <label key={value} className="contents">
                      <span>
                        {value} <span className="text-muted">({count})</span>
                      </span>
                      <select
                        value={kinds[value] ?? 'genre'}
                        onChange={(e) => setKinds({ ...kinds, [value]: e.target.value as SagaKind })}
                        className="rounded-lg border border-edge bg-ground px-2 py-1"
                      >
                        <option value="genre">Genre</option>
                        <option value="collection">Collection</option>
                      </select>
                    </label>
                  ))}
                </div>
              </>
            )}

            {scan.warnings.map((w) => (
              <p key={w} className="text-sm text-amber-300">
                {w}
              </p>
            ))}
            <div className="mt-2">
              <button type="button" onClick={runImport} disabled={scan.found.length === 0} className={primary}>
                Import
              </button>
            </div>
          </div>
        )}

        {summary && (
          <p className="rounded-lg bg-emerald-900/40 p-3 text-emerald-200">
            Imported {summary.added} items ({summary.skipped} already in the library).
            {summary.warnings.length > 0 && ` ${summary.warnings.length} warnings.`}
          </p>
        )}
      </div>
    </details>
  )
}
