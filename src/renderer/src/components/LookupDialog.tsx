import { useEffect, useState } from 'react'
import type { LookupCandidate, LookupProposal, LookupSearch } from '../../../shared/api'
import type { MediaItem } from '../../../shared/types'
import { applyReview, buildReview } from '../lib/lookup'
import type { ReviewRow } from '../lib/lookup'
import { Modal } from './Modal'
import { Button, inputClass } from './ui'

interface Props {
  item: MediaItem
  knownGenres: string[]
  wouldClash: (patch: Partial<MediaItem>) => boolean
  onApply: (next: MediaItem) => void
  onClose: () => void
}

const SOURCE_NAME = { tmdb: 'TMDB', openlibrary: 'Open Library' } as const

// Finds a poster and details for an item online. Nothing changes until you
// have looked at the match, ticked what you want and pressed Apply.
export function LookupDialog({
  item,
  knownGenres,
  wouldClash,
  onApply,
  onClose
}: Props): React.JSX.Element {
  const [initialQuery] = useState(item.title)
  const [query, setQuery] = useState(item.title)
  const [result, setResult] = useState<LookupSearch | null>(null) // null while searching
  const [chosen, setChosen] = useState<LookupCandidate | null>(null)
  const [proposal, setProposal] = useState<LookupProposal | null>(null)
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // The first search uses the item's title.
  useEffect(() => {
    let cancelled = false
    window.api.metadata
      .search(item.type, initialQuery)
      .then((r) => {
        if (!cancelled) setResult(r)
      })
      .catch((e) => {
        if (!cancelled) setResult({ ok: false, error: String(e) })
      })
    return () => {
      cancelled = true
    }
  }, [item.type, initialQuery])

  const search = async (): Promise<void> => {
    setResult(null)
    setError(null)
    try {
      setResult(await window.api.metadata.search(item.type, query))
    } catch (e) {
      setResult({ ok: false, error: String(e) })
    }
  }

  const choose = async (candidate: LookupCandidate): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      const details = await window.api.metadata.details(item.type, candidate.source, candidate.id)
      if (!details.ok) {
        setError(details.error)
        return
      }
      setChosen(candidate)
      setProposal(details.proposal)
      setRows(buildReview(item, details.proposal, knownGenres, wouldClash))
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  const apply = async (): Promise<void> => {
    if (!proposal) return
    setBusy(true)
    setError(null)
    try {
      const picked = rows.filter((r) => r.checked)
      let next = applyReview(item, picked, proposal, new Date().toISOString())
      if (picked.some((r) => r.field === 'poster')) {
        const saved = await window.api.metadata.downloadPoster(
          item.id,
          proposal.source,
          proposal.externalId
        )
        if ('error' in saved) {
          setError(saved.error)
          return
        }
        if (item.image) void window.api.images.remove(item.image)
        next = { ...next, image: saved.fileName }
      }
      onApply(next)
      onClose()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  const toggle = (id: string): void =>
    setRows(rows.map((r) => (r.id === id ? { ...r, checked: !r.checked } : r)))
  const ticked = rows.filter((r) => r.checked).length

  return (
    <Modal label="Look up online" onClose={onClose} widthClass="w-[660px]">
      <h2 className="text-xl font-extrabold">Look up online</h2>

      {!chosen || !proposal ? (
        <>
          <div className="flex gap-3">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void search()}
              aria-label="Search text"
              className={inputClass}
            />
            <Button variant="primary" onClick={() => void search()}>
              Search
            </Button>
          </div>

          {error && <p className="rounded-lg bg-danger-soft p-3 text-danger">{error}</p>}
          {result === null && <p className="text-muted">Searching…</p>}
          {result && !result.ok && (
            <p className="rounded-lg bg-warn-soft p-3 text-warn">{result.error}</p>
          )}
          {result?.ok && result.candidates.length === 0 && (
            <p className="text-muted">No matches. Try a different title.</p>
          )}
          {result?.ok &&
            result.candidates.map((c) => (
              <button
                key={`${c.source}:${c.id}`}
                type="button"
                disabled={busy}
                onClick={() => void choose(c)}
                className="flex cursor-pointer gap-4 rounded-xl border border-line p-3 text-left hover:border-accent disabled:opacity-50"
              >
                <div className="h-[84px] w-14 flex-none overflow-hidden rounded-md bg-surface">
                  {c.thumb && <img src={c.thumb} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0">
                  <div className="font-bold">
                    {c.title} <span className="font-normal text-muted">{c.year ?? ''}</span>
                  </div>
                  {c.subtitle && <div className="text-sm text-muted">{c.subtitle}</div>}
                  {c.overview && (
                    <div className="line-clamp-2 text-sm text-muted">{c.overview}</div>
                  )}
                </div>
              </button>
            ))}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">
              Search results come from {SOURCE_NAME[item.type === 'book' ? 'openlibrary' : 'tmdb']}.
            </span>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex gap-4">
            <div className="h-[120px] w-20 flex-none overflow-hidden rounded-lg bg-surface">
              {chosen.thumb && (
                <img src={chosen.thumb} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <div className="font-bold">
                {chosen.title} <span className="font-normal text-muted">{chosen.year ?? ''}</span>
              </div>
              {proposal.overview && (
                <div className="line-clamp-4 text-sm text-muted">{proposal.overview}</div>
              )}
            </div>
          </div>

          <p className="text-sm text-muted">
            Everything is ticked. Untick what you do not want, then apply.
          </p>
          {rows.length === 0 && <p className="text-muted">Nothing new to add from this match.</p>}
          {rows.map((r) => (
            <label
              key={r.id}
              className="flex cursor-pointer items-center gap-3 border-t border-line py-2"
            >
              <input
                type="checkbox"
                checked={r.checked}
                onChange={() => toggle(r.id)}
                className="h-4 w-4 accent-accent"
              />
              <span className="w-24 font-bold">{r.label}</span>
              <span className="text-muted">{r.current}</span>
              <span className="text-muted">→</span>
              <span>{r.proposed}</span>
            </label>
          ))}

          {error && <p className="rounded-lg bg-danger-soft p-3 text-danger">{error}</p>}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">Data from {SOURCE_NAME[chosen.source]}.</span>
            <div className="flex gap-3">
              <Button disabled={busy} onClick={() => setChosen(null)}>
                Back
              </Button>
              <Button
                variant="primary"
                disabled={busy || ticked === 0}
                onClick={() => void apply()}
              >
                {ticked === 0
                  ? 'Nothing ticked'
                  : `Apply ${ticked} ${ticked === 1 ? 'change' : 'changes'}`}
              </Button>
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}
