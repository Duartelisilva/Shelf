import { useEffect, useState } from 'react'
import type { ImportSummary, V1Scan } from '../../shared/api'
import type { SagaKind } from '../../shared/importV1'
import type { Library } from '../../shared/types'

// Temporary screen: lets you import your V1 files and see the stored library.
// The real Library screen replaces this later.
function App(): React.JSX.Element {
  const [library, setLibrary] = useState<Library | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [scan, setScan] = useState<V1Scan | null>(null)
  const [kinds, setKinds] = useState<Record<string, SagaKind>>({})
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api.library
      .load()
      .then((result) => {
        setLibrary(result.library)
        setNotice(result.notice ?? null)
      })
      .catch((e) => setError(String(e)))
  }, [])

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
      setLibrary(result.library)
      setScan(null)
    } catch (e) {
      setError(String(e))
    }
  }

  const items = library?.items ?? []
  const sagaValues = scan ? Object.entries(scan.sagaCounts).sort((a, b) => b[1] - a[1]) : []

  return (
    <div className="h-full overflow-y-auto p-8">
      <h1 className="text-3xl font-extrabold">Shelf</h1>
      <p className="mt-1 text-slate-400">
        {library ? `${items.length} items in your library` : 'Loading…'}
      </p>

      {notice && <p className="mt-4 rounded-lg bg-amber-900/40 p-3 text-amber-200">{notice}</p>}
      {error && <p className="mt-4 rounded-lg bg-red-900/40 p-3 text-red-200">{error}</p>}

      <button
        onClick={pickFolder}
        className="mt-6 rounded-lg bg-indigo-300 px-4 py-2 font-bold text-slate-900"
      >
        Import from MediaTracker V1…
      </button>

      {scan && (
        <section className="mt-6 rounded-xl border border-slate-700 bg-slate-900 p-5">
          <p>
            Found: {scan.found.length ? scan.found.join(', ') : 'nothing'}
            {scan.missing.length > 0 && (
              <span className="text-slate-400"> · not found: {scan.missing.join(', ')}</span>
            )}
          </p>
          {scan.problems.map((p) => (
            <p key={p} className="text-red-300">
              {p}
            </p>
          ))}
          <p className="mt-2 text-slate-300">
            {scan.counts.movies} movies, {scan.counts.series} series, {scan.counts.books} books,{' '}
            {scan.counts.wishlist} on the wishlist
          </p>

          {sagaValues.length > 0 && (
            <>
              <h2 className="mt-5 font-bold">What are these old &quot;Saga&quot; values?</h2>
              <p className="text-sm text-slate-400">
                Genres describe what a movie is (Horror). Collections group films (Marvel).
              </p>
              <div className="mt-3 grid max-w-md grid-cols-[1fr_auto] gap-x-4 gap-y-2">
                {sagaValues.map(([value, count]) => (
                  <label key={value} className="contents">
                    <span>
                      {value} <span className="text-slate-500">({count})</span>
                    </span>
                    <select
                      value={kinds[value] ?? 'genre'}
                      onChange={(e) => setKinds({ ...kinds, [value]: e.target.value as SagaKind })}
                      className="rounded bg-slate-800 px-2 py-1"
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
            <p key={w} className="mt-2 text-sm text-amber-300">
              {w}
            </p>
          ))}

          <button
            onClick={runImport}
            disabled={scan.found.length === 0}
            className="mt-5 rounded-lg bg-indigo-300 px-4 py-2 font-bold text-slate-900 disabled:opacity-40"
          >
            Import
          </button>
        </section>
      )}

      {summary && (
        <p className="mt-6 rounded-lg bg-emerald-900/40 p-3 text-emerald-200">
          Imported {summary.added} items ({summary.skipped} already in the library).
          {summary.warnings.length > 0 && ` ${summary.warnings.length} warnings.`}
        </p>
      )}

      {items.length > 0 && (
        <table className="mt-8 w-full max-w-4xl text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="py-1">Title</th>
              <th>Type</th>
              <th>Year</th>
              <th>Genres</th>
              <th>Franchise</th>
              <th>Collection</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 60).map((item) => (
              <tr key={item.id} className="border-t border-slate-800">
                <td className="py-1">{item.title}</td>
                <td>{item.type}</td>
                <td>{item.year ?? ''}</td>
                <td>{item.genres.join(', ')}</td>
                <td>{item.franchise ?? ''}</td>
                <td>{item.collection ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default App
