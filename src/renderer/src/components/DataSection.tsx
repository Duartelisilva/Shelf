import { useEffect, useState } from 'react'
import type { BackupInfo, ImportMode, ImportPreview } from '../../../shared/api'
import type { Library } from '../../../shared/types'
import { formatDate } from '../lib/library'
import { ConfirmDialog } from './ConfirmDialog'

interface Props {
  onLibraryChanged: (library: Library) => void
}

interface Confirm {
  title: string
  message: string
  confirmLabel: string
  run: () => Promise<void>
}

const button = 'cursor-pointer rounded-lg border border-edge px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40'
const primary = 'cursor-pointer rounded-lg bg-accent px-4 py-2 font-bold text-on-accent disabled:cursor-not-allowed disabled:opacity-40'

const formatBytes = (bytes: number): string =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

function backupLabel(info: BackupInfo): string {
  if (info.kind === 'daily') return `Daily backup · ${formatDate(info.date)}`
  const when = new Date(info.date).toLocaleString()
  return `Before ${info.kind === 'restore' ? 'a restore' : 'an import'} · ${when}`
}

// Export, import and restore of your own library file, plus the backups list.
export function DataSection({ onLibraryChanged }: Props): React.JSX.Element {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [mode, setMode] = useState<ImportMode>('add')
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [confirm, setConfirm] = useState<Confirm | null>(null)

  useEffect(() => {
    window.api.data
      .listBackups()
      .then(setBackups)
      .catch(() => setBackups([]))
  }, [])

  // Runs an action, shows its result, and refreshes the backups list afterwards.
  const run = async (action: () => Promise<string | null>): Promise<void> => {
    setBusy(true)
    setMessage(null)
    try {
      const text = await action()
      if (text) setMessage({ ok: true, text })
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
      window.api.data.listBackups().then(setBackups).catch(() => undefined)
    }
  }

  const exportNow = (): Promise<void> =>
    run(async () => {
      const result = await window.api.data.exportLibrary()
      return result ? `Exported ${result.items} items and ${result.images} images to ${result.path}` : null
    })

  const choose = (): Promise<void> =>
    run(async () => {
      const result = await window.api.data.pickImport()
      if (!result) return null
      if ('error' in result) throw new Error(result.error)
      setPreview(result)
      setMode('add')
      return null
    })

  const doImport = (chosen: ImportMode): Promise<void> =>
    run(async () => {
      const summary = await window.api.data.commitImport(chosen)
      onLibraryChanged(summary.library)
      setPreview(null)
      if (chosen === 'replace') return `Your library now has ${summary.added} items.`
      const parts = [`Added ${summary.added} items`]
      if (chosen === 'update') parts.push(`updated ${summary.updated}`)
      return `${parts.join(', ')}. ${summary.skipped} were already in your library.`
    })

  const importNow = (): void => {
    if (mode === 'add') {
      void doImport('add')
      return
    }
    setConfirm(
      mode === 'update'
        ? {
            title: 'Update changed items?',
            message: `${preview?.changed.length ?? 0} items in your library will take the version in this file. A copy of your current library is kept in the backups list below.`,
            confirmLabel: 'Update',
            run: () => doImport('update')
          }
        : {
            title: 'Replace your library?',
            message: 'Your library will become exactly what is in this file. A copy of your current library is kept in the backups list below.',
            confirmLabel: 'Replace',
            run: () => doImport('replace')
          }
    )
  }

  const restore = (info: BackupInfo): void =>
    setConfirm({
      title: 'Restore this backup?',
      message: `Your library will be replaced by this copy (${info.items} items). A copy of your current library is kept in the backups list first. Card images are not part of backups.`,
      confirmLabel: 'Restore',
      run: () =>
        run(async () => {
          const library = await window.api.data.restoreBackup(info.name)
          onLibraryChanged(library)
          return `Restored ${library.items.length} items.`
        })
    })

  return (
    <section className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-5">
      <h2 className="text-base font-extrabold">Your data</h2>

      {message && (
        <p className={`rounded-lg p-3 ${message.ok ? 'bg-ok-soft text-ok' : 'bg-danger-soft text-danger'}`}>{message.text}</p>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-muted">
          An export is one file with your library and all its images. Importing it later (here or on another computer) brings everything back.
        </p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={exportNow} disabled={busy} className={primary}>
            Export library…
          </button>
          <button type="button" onClick={choose} disabled={busy} className={button}>
            Import from a file…
          </button>
          <button type="button" onClick={() => void window.api.data.openDataFolder()} className={button}>
            Open data folder
          </button>
        </div>
      </div>

      {preview && (
        <div className="flex flex-col gap-3 rounded-lg border border-line p-4">
          <p className="font-bold">{preview.file}</p>
          <p className="text-muted">
            Exported {formatDate(preview.exportedAt.slice(0, 10))} with Shelf {preview.appVersion}: {preview.counts.movies} movies,{' '}
            {preview.counts.series} series, {preview.counts.books} books, {preview.counts.wishlist} on the wishlist, {preview.images} images.
          </p>
          <p>
            <span className="font-bold">{preview.newItems}</span> new, <span className="font-bold">{preview.changed.length}</span> different from yours,{' '}
            <span className="font-bold">{preview.alreadyHere}</span> identical.
          </p>
          {preview.changed.length > 0 && (
            <div className="flex flex-col gap-1 text-sm">
              <p className="text-muted">Different from your library (your version, then the file&apos;s):</p>
              {preview.changed.slice(0, 20).map((c) => (
                <p key={c.id}>
                  <span className="font-bold">{c.title}</span> <span className="text-muted">· {c.changes.join(', ')}</span>
                </p>
              ))}
              {preview.changed.length > 20 && <p className="text-muted">and {preview.changed.length - 20} more</p>}
            </div>
          )}
          {preview.warnings.map((w) => (
            <p key={w} className="text-sm text-warn">
              {w}
            </p>
          ))}
          <div className="flex overflow-hidden rounded-[10px] border border-edge" role="group" aria-label="Import mode">
            {(['add', 'update', 'replace'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`flex-1 cursor-pointer px-3 py-2 ${mode === m ? 'bg-accent-soft font-bold text-accent' : 'text-muted'}`}
              >
                {m === 'add' ? 'Add new only' : m === 'update' ? 'Add and update' : 'Replace all'}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted">
            {mode === 'add'
              ? 'Adds the new items. Items you already have are left exactly as they are, even if the file has a different version of them.'
              : mode === 'update'
                ? 'Adds the new items and gives the different ones the version from the file. Everything else is left alone. A copy of your current library is kept first.'
                : 'Your library becomes exactly this file. A copy of the current one is kept first.'}
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={importNow} disabled={busy} className={primary}>
              Import
            </button>
            <button type="button" onClick={() => setPreview(null)} className={button}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="font-bold">Backups</h3>
        <p className="text-sm text-muted">
          Shelf keeps a copy of your library from before your first change each day (the last 14), and a copy before every restore or replace.
          Backups hold the library only; images travel in exports.
        </p>
        {backups.length === 0 ? (
          <p className="text-muted">No backups yet. The first appears after the second day you change something.</p>
        ) : (
          backups.map((b) => (
            <div key={b.name} className="flex items-center gap-3 border-t border-line py-2">
              <span className="flex-1">{backupLabel(b)}</span>
              <span className="text-muted">
                {b.items} items · {formatBytes(b.bytes)}
              </span>
              <button type="button" onClick={() => restore(b)} disabled={busy} className={button}>
                Restore
              </button>
            </div>
          ))
        )}
      </div>

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger
          onConfirm={() => {
            const next = confirm
            setConfirm(null)
            void next.run()
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </section>
  )
}
