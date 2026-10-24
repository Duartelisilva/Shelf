// Connects the window to storage and the importer. Every handler here is the
// only way the UI can read or write your data.

import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { CHANNELS } from '../shared/api'
import type { ImportSummary, V1Scan } from '../shared/api'
import { importV1, mergeIntoLibrary } from '../shared/importV1'
import type { SagaKind } from '../shared/importV1'
import type { Library } from '../shared/types'
import { createStorage } from './storage'
import { readV1Folder } from './v1files'

export function registerIpc(): void {
  const storage = createStorage(app.getPath('userData'))
  // The folder is remembered here, not sent back by the UI, so the window can
  // never ask the app to read an arbitrary path.
  let pendingFolder: string | null = null

  ipcMain.handle(CHANNELS.libraryLoad, () => storage.load())
  ipcMain.handle(CHANNELS.librarySave, (_event, library: Library) => storage.save(library))

  ipcMain.handle(CHANNELS.importPick, async (): Promise<V1Scan | null> => {
    const options = {
      title: 'Select the folder with your MediaTracker V1 files',
      properties: ['openDirectory' as const]
    }
    const parent = BrowserWindow.getFocusedWindow()
    const picked = parent
      ? await dialog.showOpenDialog(parent, options)
      : await dialog.showOpenDialog(options)
    if (picked.canceled || picked.filePaths.length === 0) return null

    const folder = picked.filePaths[0]
    const v1 = await readV1Folder(folder)
    const preview = importV1(v1.files)
    pendingFolder = v1.found.length > 0 ? folder : null

    const count = (type: string, wishlist: boolean): number =>
      preview.items.filter((i) => i.type === type && (i.status === 'wishlist') === wishlist).length
    return {
      folder,
      found: v1.found,
      missing: v1.missing,
      problems: v1.problems,
      counts: {
        movies: count('movie', false),
        series: count('series', false),
        books: count('book', false),
        wishlist: preview.items.filter((i) => i.status === 'wishlist').length
      },
      sagaCounts: preview.sagaCounts,
      warnings: preview.warnings
    }
  })

  ipcMain.handle(
    CHANNELS.importCommit,
    async (_event, sagaAs: Record<string, SagaKind>): Promise<ImportSummary> => {
      if (!pendingFolder) throw new Error('No folder was selected.')
      // Only "collection" is ever needed from the UI; everything else is a genre.
      const kinds: Record<string, SagaKind> = {}
      for (const [value, kind] of Object.entries(sagaAs ?? {})) {
        if (kind === 'collection') kinds[value] = 'collection'
      }
      const v1 = await readV1Folder(pendingFolder)
      const result = importV1(v1.files, { sagaAs: kinds })
      const { library } = await storage.load()
      const merged = mergeIntoLibrary(library, result.items)
      await storage.save(merged.library)
      pendingFolder = null
      return {
        added: merged.added,
        skipped: merged.skipped,
        warnings: result.warnings,
        library: merged.library
      }
    }
  )
}
