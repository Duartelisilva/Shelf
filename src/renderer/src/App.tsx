import { useEffect, useMemo, useState } from 'react'
import type { Library, MediaItem } from '../../shared/types'
import { AddItemDialog } from './components/AddItemDialog'
import { ImportPanel } from './components/ImportPanel'
import { LibraryScreen } from './components/LibraryScreen'
import { Sidebar } from './components/Sidebar'
import { createItem } from './lib/edit'
import type { Draft } from './lib/edit'
import { sectionCounts } from './lib/library'
import type { Section } from './lib/library'

function App(): React.JSX.Element {
  const [library, setLibrary] = useState<Library | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [section, setSection] = useState<Section>('library')
  const [importing, setImporting] = useState(false)
  const [adding, setAdding] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // The list as it was before the last undoable change (delete, bulk genre).
  const [undo, setUndo] = useState<{ label: string; previous: Library } | null>(null)

  useEffect(() => {
    window.api.library
      .load()
      .then((result) => {
        setLibrary(result.library)
        setNotice(result.notice ?? null)
      })
      .catch((e) => setLoadError(String(e)))
  }, [])

  // Ctrl+N opens the add dialog.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.ctrlKey && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        setAdding(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The undo offer disappears after a few seconds.
  useEffect(() => {
    if (!undo) return
    const timer = setTimeout(() => setUndo(null), 8000)
    return () => clearTimeout(timer)
  }, [undo])

  const items = useMemo(() => library?.items ?? [], [library])
  const counts = useMemo(() => sectionCounts(items), [items])

  const persist = (next: Library): void => {
    setLibrary(next)
    setSaveError(null)
    window.api.library.save(next).catch((e) => setSaveError(`Could not save your library: ${String(e)}`))
  }

  const commit = (nextItems: MediaItem[], undoLabel?: string): void => {
    if (!library) return
    setUndo(undoLabel ? { label: undoLabel, previous: library } : null)
    persist({ ...library, items: nextItems })
  }

  const undoLast = (): void => {
    if (!undo) return
    persist(undo.previous)
    setUndo(null)
  }

  const addItem = (draft: Draft): void => {
    const item = createItem(draft, globalThis.crypto.randomUUID(), new Date().toISOString())
    commit([...items, item])
    setAdding(false)
    setImporting(false)
    setSection('library')
    setSelectedId(item.id)
  }

  if (loadError) return <p className="p-8 text-red-300">{loadError}</p>
  if (!library) return <p className="p-8 text-muted">Loading…</p>

  return (
    <div className="flex h-full">
      <Sidebar
        section={section}
        counts={counts}
        importing={importing}
        onSection={(s) => {
          setSection(s)
          setImporting(false)
        }}
        onImport={() => setImporting(true)}
      />
      <main className="relative flex min-w-0 flex-1 flex-col">
        {notice && <p className="bg-amber-900/40 px-7 py-2 text-amber-200">{notice}</p>}
        {saveError && <p className="bg-red-900/40 px-7 py-2 text-red-200">{saveError}</p>}
        {importing ? (
          <ImportPanel onImported={setLibrary} onClose={() => setImporting(false)} />
        ) : (
          <LibraryScreen
            items={items}
            section={section}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={commit}
            onAdd={() => setAdding(true)}
            onImport={() => setImporting(true)}
          />
        )}
        {undo && (
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-xl border border-edge bg-panel px-5 py-3 shadow-lg">
            <span>{undo.label}</span>
            <button type="button" onClick={undoLast} className="cursor-pointer font-extrabold text-accent">
              Undo
            </button>
          </div>
        )}
      </main>
      {adding && <AddItemDialog items={items} onAdd={addItem} onClose={() => setAdding(false)} />}
    </div>
  )
}

export default App
