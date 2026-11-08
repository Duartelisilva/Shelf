import { useState } from 'react'
import type { ImportSummary, V1Scan } from '../../../shared/api'
import type { Library } from '../../../shared/types'
import { buttonClass } from '../lib/uiStyles'

interface Props {
  onImported: (library: Library) => void
}

// First-time setup only: bring in the files of the old MediaTracker. Genres and
// collections are not imported (V1 mixed them in one field); fill them in
// afterwards with "Look up online". Once your data is in Shelf, export and
// import (above) are what you use.
export function ImportPanel({ onImported }: Props): React.JSX.Element {
  const [scan, setScan] = useState<V1Scan | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pickFolder = async (): Promise<void> => {
    setError(null)
    setSummary(null)
    try {
      const result = await window.api.importV1.pickFolder()
      if (result) setScan(result)
    } catch (e) {
      setError(String(e))
    }
  }

  const runImport = async (): Promise<void> => {
    setError(null)
    try {
      const result = await window.api.importV1.commit()
      setSummary(result)
      onImported(result.library)
      setScan(null)
    } catch (e) {
      setError(String(e))
    }
  }

  const primary = buttonClass('primary')

  return (
    <details className="rounded-xl border border-line bg-surface p-5">
      <summary className="cursor-pointer text-base font-extrabold">
        First-time setup: import from MediaTracker V1
      </summary>
      <div className="mt-4 flex flex-col gap-4">
        <p className="text-muted">
          Pick the folder that holds your old files (movies.json, seriess.json, bookss.json,
          wishlists.json). Items already in Shelf are skipped. Genres and collections are not
          imported: add them afterwards with Look up online.
        </p>
        {error && <p className="rounded-lg bg-danger-soft p-3 text-danger">{error}</p>}
        <div>
          <button type="button" onClick={pickFolder} className={primary}>
            Choose folder…
          </button>
        </div>

        {scan && (
          <div className="flex flex-col gap-2 rounded-lg border border-line p-4">
            <p>
              Found: {scan.found.length ? scan.found.join(', ') : 'nothing'}
              {scan.missing.length > 0 && (
                <span className="text-muted"> · not found: {scan.missing.join(', ')}</span>
              )}
            </p>
            {scan.problems.map((p) => (
              <p key={p} className="text-danger">
                {p}
              </p>
            ))}
            <p className="text-muted">
              {scan.counts.movies} movies, {scan.counts.series} series, {scan.counts.books} books,{' '}
              {scan.counts.wishlist} on the wishlist
            </p>
            {scan.warnings.map((w) => (
              <p key={w} className="text-sm text-warn">
                {w}
              </p>
            ))}
            <div className="mt-2">
              <button
                type="button"
                onClick={runImport}
                disabled={scan.found.length === 0}
                className={primary}
              >
                Import
              </button>
            </div>
          </div>
        )}

        {summary && (
          <p className="rounded-lg bg-ok-soft p-3 text-ok">
            Imported {summary.added} items ({summary.skipped} already in the library).
            {summary.warnings.length > 0 && ` ${summary.warnings.length} warnings.`}
          </p>
        )}
      </div>
    </details>
  )
}
