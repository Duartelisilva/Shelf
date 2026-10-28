// Connects the window to storage, images, settings, import/export and the V1
// importer. Every handler here is the only way the UI can read or write your data.

import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { CHANNELS } from '../shared/api'
import type {
  DataImportSummary,
  ExportResult,
  ImagePick,
  ImportMode,
  ImportPreview,
  ImportSummary,
  KeyCheck,
  V1Scan
} from '../shared/api'
import { importV1, mergeIntoLibrary } from '../shared/importV1'
import type { SagaKind } from '../shared/importV1'
import type { Library } from '../shared/types'
import { ARCHIVE_EXTENSION } from './archive'
import { createDataService } from './dataService'
import type { PendingImport } from './dataService'
import { createImages } from './images'
import { checkTmdbKey } from './metadata/tmdb'
import { createSecretBox } from './secret'
import { createSettingsStore } from './settings'
import { BACKUPS_DIR, createStorage } from './storage'
import { readV1Folder } from './v1files'

const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000

// File pickers, attached to the window that has the focus.
async function chooseFile(options: Record<string, unknown>): Promise<{ canceled: boolean; filePaths: string[] }> {
  const parent = BrowserWindow.getFocusedWindow()
  return parent ? dialog.showOpenDialog(parent, options) : dialog.showOpenDialog(options)
}
async function chooseSavePath(options: Record<string, unknown>): Promise<{ canceled: boolean; filePath?: string }> {
  const parent = BrowserWindow.getFocusedWindow()
  return parent ? dialog.showSaveDialog(parent, options) : dialog.showSaveDialog(options)
}

const pad = (n: number): string => String(n).padStart(2, '0')
const todayStamp = (d = new Date()): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function registerIpc(): void {
  const userData = app.getPath('userData')
  const storage = createStorage(userData)
  const images = createImages()
  const settings = createSettingsStore(userData, createSecretBox())
  const data = createDataService({
    storage,
    images: images.store,
    backupsDir: join(userData, BACKUPS_DIR),
    appVersion: app.getVersion()
  })
  // What the user picked but has not confirmed yet. Kept here, not in the window.
  let pendingFolder: string | null = null
  let pendingImport: PendingImport | null = null

  // ----- library and images
  ipcMain.handle(CHANNELS.libraryLoad, async () => {
    const result = await storage.load()
    // Delete image copies no item uses, once they are two weeks old (so an undo or
    // a restore can still find them). Skipped when the library could not be read
    // normally or is empty, so a damaged file can never wipe your images.
    if (!result.notice && result.library.items.length > 0) {
      const used = result.library.items.flatMap((i) => (i.image ? [i.image] : []))
      await images.store.removeUnused(new Set(used), TWO_WEEKS)
    }
    return result
  })
  ipcMain.handle(CHANNELS.librarySave, (_event, library: Library) => storage.save(library))
  ipcMain.handle(CHANNELS.imagePick, (_event, itemId: string): Promise<ImagePick> => images.pick(itemId))
  ipcMain.handle(CHANNELS.imageRemove, (_event, fileName: string) => images.store.remove(fileName))

  // ----- export, import and backups of your own library
  ipcMain.handle(CHANNELS.dataExport, async (): Promise<ExportResult | null> => {
    const picked = await chooseSavePath({
      title: 'Export your library',
      defaultPath: `Shelf-backup-${todayStamp()}.${ARCHIVE_EXTENSION}`,
      filters: [{ name: 'Shelf export', extensions: [ARCHIVE_EXTENSION] }]
    })
    if (picked.canceled || !picked.filePath) return null
    return data.exportTo(picked.filePath)
  })

  ipcMain.handle(CHANNELS.dataPickImport, async (): Promise<ImportPreview | { error: string } | null> => {
    const picked = await chooseFile({
      title: 'Choose a Shelf export',
      properties: ['openFile'],
      filters: [{ name: 'Shelf export', extensions: [ARCHIVE_EXTENSION] }]
    })
    if (picked.canceled || picked.filePaths.length === 0) return null
    try {
      pendingImport = await data.inspect(picked.filePaths[0])
      return pendingImport.preview
    } catch (error) {
      pendingImport = null
      return { error: error instanceof Error ? error.message : 'The file could not be read.' }
    }
  })

  ipcMain.handle(CHANNELS.dataCommitImport, async (_event, mode: ImportMode): Promise<DataImportSummary> => {
    if (!pendingImport) throw new Error('No file was chosen.')
    if (mode !== 'add' && mode !== 'update' && mode !== 'replace') throw new Error('Unknown import mode.')
    const summary = await pendingImport.commit(mode)
    pendingImport = null
    return summary
  })

  ipcMain.handle(CHANNELS.dataListBackups, () => data.listBackups())
  ipcMain.handle(CHANNELS.dataRestoreBackup, (_event, name: string) => data.restoreBackup(String(name)))
  ipcMain.handle(CHANNELS.dataOpenFolder, async () => {
    await shell.openPath(userData)
  })

  // ----- settings (the TMDB key)
  ipcMain.handle(CHANNELS.settingsStatus, () => settings.status())
  ipcMain.handle(CHANNELS.settingsSaveTmdbKey, (_event, key: string): Promise<KeyCheck> | KeyCheck =>
    typeof key === 'string' ? settings.saveTmdbKey(key) : { ok: false, error: 'No key was given.' }
  )
  ipcMain.handle(CHANNELS.settingsClearTmdbKey, () => settings.clearTmdbKey())
  ipcMain.handle(CHANNELS.settingsTestTmdbKey, async (): Promise<KeyCheck> => {
    const key = await settings.getTmdbKey()
    if (!key) return { ok: false, error: 'No key is saved yet.' }
    return checkTmdbKey(key)
  })

  // ----- first-time setup: import from MediaTracker V1
  ipcMain.handle(CHANNELS.importPick, async (): Promise<V1Scan | null> => {
    const picked = await chooseFile({
      title: 'Select the folder with your MediaTracker V1 files',
      properties: ['openDirectory']
    })
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
      await storage.flush()
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
