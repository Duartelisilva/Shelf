import { useEffect, useMemo, useState } from 'react'
import type { ThemeChoice } from '../../shared/themes'
import type { Library, MediaItem } from '../../shared/types'
import { AddItemDialog } from './components/AddItemDialog'
import { LibraryScreen } from './components/LibraryScreen'
import { SettingsScreen } from './components/SettingsScreen'
import { Sidebar } from './components/Sidebar'
import type { View } from './components/Sidebar'
import { StatsScreen } from './components/StatsScreen'
import { sectionCounts, sectionItems } from './lib/library'
import type { Section } from './lib/library'
import { applyTheme, cachedTheme, watchSystemTheme } from './lib/theme'

// The window opens with the colours it had last time, before anything is loaded.
applyTheme(cachedTheme())

function App(): React.JSX.Element {
  const [library, setLibrary] = useState<Library | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [section, setSection] = useState<Section>('library')
  const [view, setView] = useState<View>('library')
  const [adding, setAdding] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [theme, setTheme] = useState<ThemeChoice>(cachedTheme)
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

  // The saved colour theme (the cached one above is only used until it arrives).
  useEffect(() => {
    window.api.preferences
      .get()
      .then((preferences) => setTheme(preferences.theme))
      .catch(() => undefined)
  }, [])

  // Shows the chosen theme, and follows Windows when the choice is "Match Windows".
  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    return watchSystemTheme(() => applyTheme('system'))
  }, [theme])

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

  // The main process already saved a library it replaced (import, restore); the
  // window only has to show it, and forget things that may no longer exist.
  const replaceLibrary = (next: Library): void => {
    setLibrary(next)
    setSelectedId(null)
    setUndo(null)
  }

  const changeTheme = (next: ThemeChoice): void => {
    setTheme(next)
    window.api.preferences.setTheme(next).catch((e) => setSaveError(`Could not save the theme: ${String(e)}`))
  }

  const undoLast = (): void => {
    if (!undo) return
    persist(undo.previous)
    setUndo(null)
  }

  const addItem = (item: MediaItem): void => {
    commit([...items, item])
    setAdding(false)
    setView('library')
    if (sectionItems([item], section).length === 0) setSection('library')
    setSelectedId(item.id)
  }

  if (loadError) return <p className="p-8 text-danger">{loadError}</p>
  if (!library) return <p className="p-8 text-muted">Loading…</p>

  return (
    <div className="flex h-full">
      <Sidebar
        view={view}
        section={section}
        counts={counts}
        onSection={(s) => {
          setSection(s)
          setView('library')
        }}
        onView={setView}
      />
      <main className="relative flex min-w-0 flex-1 flex-col">
        {notice && <p className="bg-warn-soft px-7 py-2 text-warn">{notice}</p>}
        {saveError && <p className="bg-danger-soft px-7 py-2 text-danger">{saveError}</p>}
        {view === 'settings' ? (
          <SettingsScreen theme={theme} onTheme={changeTheme} onLibraryChanged={replaceLibrary} />
        ) : view === 'stats' ? (
          <StatsScreen items={items} />
        ) : (
          <LibraryScreen
            items={items}
            section={section}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={commit}
            onAdd={() => setAdding(true)}
            onOpenSettings={() => setView('settings')}
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
      {adding && <AddItemDialog items={items} section={section} onAdd={addItem} onClose={() => setAdding(false)} />}
    </div>
  )
}

export default App
