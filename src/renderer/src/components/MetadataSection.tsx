import { useEffect, useState } from 'react'
import type { SettingsStatus } from '../../../shared/api'

const button = 'cursor-pointer rounded-lg border border-edge px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40'

// The key for the optional poster and details lookup. It is stored encrypted by
// the operating system and never shown again: Shelf only tells you that one is
// saved and its last four characters.
export function MetadataSection(): React.JSX.Element {
  const [status, setStatus] = useState<SettingsStatus | null>(null)
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    window.api.settings
      .status()
      .then(setStatus)
      .catch(() => setStatus(null))
  }, [])

  const refresh = (): void => {
    window.api.settings.status().then(setStatus).catch(() => undefined)
  }

  const save = async (): Promise<void> => {
    setBusy(true)
    setMessage(null)
    try {
      const result = await window.api.settings.saveTmdbKey(key)
      if (result.ok) {
        setKey('')
        setMessage({ ok: true, text: 'Key saved. Use Test key to check that TMDB accepts it.' })
      } else {
        setMessage({ ok: false, text: result.error })
      }
    } catch (e) {
      setMessage({ ok: false, text: String(e) })
    } finally {
      setBusy(false)
      refresh()
    }
  }

  const test = async (): Promise<void> => {
    setBusy(true)
    setMessage(null)
    try {
      const result = await window.api.settings.testTmdbKey()
      setMessage(result.ok ? { ok: true, text: 'TMDB accepted the key.' } : { ok: false, text: result.error })
    } catch (e) {
      setMessage({ ok: false, text: String(e) })
    } finally {
      setBusy(false)
    }
  }

  const remove = async (): Promise<void> => {
    setBusy(true)
    setMessage(null)
    try {
      await window.api.settings.clearTmdbKey()
      setMessage({ ok: true, text: 'Key removed.' })
    } catch (e) {
      setMessage({ ok: false, text: String(e) })
    } finally {
      setBusy(false)
      refresh()
    }
  }

  const hasKey = status?.tmdb.hasKey === true

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      <h2 className="text-base font-extrabold">Posters and details (optional)</h2>
      <p className="text-muted">
        Shelf can look up posters and details for movies and series on TMDB, and you approve every match before anything changes.
        For that it needs your own free TMDB key. Books use Open Library, which needs no key.
      </p>
      <p className="text-sm text-muted">
        Get the key in your TMDB account under Settings, API (
        <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" className="text-accent underline">
          themoviedb.org/settings/api
        </a>
        ). Either the &quot;API Key&quot; or the &quot;API Read Access Token&quot; works.
      </p>

      {message && (
        <p className={`rounded-lg p-3 ${message.ok ? 'bg-ok-soft text-ok' : 'bg-danger-soft text-danger'}`}>{message.text}</p>
      )}

      {hasKey ? (
        <div className="flex flex-wrap items-center gap-3">
          <span>
            A key is saved <span className="text-muted">(ends in {status?.tmdb.hint})</span>
          </span>
          <button type="button" onClick={test} disabled={busy} className={button}>
            Test key
          </button>
          <button type="button" onClick={remove} disabled={busy} className={button}>
            Remove key
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void save()}
            placeholder="Paste your TMDB key"
            aria-label="TMDB key"
            autoComplete="off"
            className="w-[360px] rounded-lg border border-edge bg-ground px-3 py-2"
          />
          <button type="button" onClick={save} disabled={busy || !key.trim()} className="cursor-pointer rounded-lg bg-accent px-4 py-2 font-bold text-on-accent disabled:opacity-40">
            Save key
          </button>
        </div>
      )}

      {status && !status.encryption && (
        <p className="text-sm text-warn">
          This computer cannot store secrets securely, so a key cannot be saved here.
        </p>
      )}
      <p className="text-xs text-muted">
        The key is encrypted by Windows for your account and is only ever sent to TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
    </section>
  )
}
