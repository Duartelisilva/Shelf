// The contract between the app window (renderer) and the background process
// (main). The renderer never touches files directly: it can only call these.

import type { Library } from './types'
import type { SagaKind } from './importV1'

export const CHANNELS = {
  libraryLoad: 'library:load',
  librarySave: 'library:save',
  importPick: 'importV1:pick',
  importCommit: 'importV1:commit',
  imagePick: 'image:pick',
  imageRemove: 'image:remove',
  dataExport: 'data:export',
  dataPickImport: 'data:pickImport',
  dataCommitImport: 'data:commitImport',
  dataListBackups: 'data:listBackups',
  dataRestoreBackup: 'data:restoreBackup',
  dataOpenFolder: 'data:openFolder',
  settingsStatus: 'settings:status',
  settingsSaveTmdbKey: 'settings:saveTmdbKey',
  settingsClearTmdbKey: 'settings:clearTmdbKey',
  settingsTestTmdbKey: 'settings:testTmdbKey'
} as const

export interface LoadResult {
  library: Library
  notice?: string // set when a damaged library file was moved aside
}

// What was found in the folder the user picked, before anything is imported.
export interface V1Scan {
  folder: string
  found: string[]
  missing: string[]
  problems: string[]
  counts: { movies: number; series: number; books: number; wishlist: number }
  sagaCounts: Record<string, number>
  warnings: string[]
}

export interface ImportSummary {
  added: number
  skipped: number
  warnings: string[]
  library: Library
}

// Export and import of your own library file (.shelf)
// add: only items you do not have; update: those plus the file's version of items that
// differ; replace: your library becomes exactly the file.
export type ImportMode = 'add' | 'update' | 'replace'

// An item that is in both your library and the file, but differs.
export interface ChangedItem {
  id: string
  title: string
  changes: string[] // what differs, your version -> the file's
}

export interface ExportResult {
  path: string
  items: number
  images: number
}

export interface ImportPreview {
  file: string
  exportedAt: string
  appVersion: string
  counts: { movies: number; series: number; books: number; wishlist: number }
  images: number
  newItems: number // not in your library yet
  changed: ChangedItem[] // in both, but different
  alreadyHere: number // in both and identical
  warnings: string[]
}

export interface DataImportSummary {
  mode: ImportMode
  added: number
  updated: number
  skipped: number
  warnings: string[]
  library: Library
}

export interface BackupInfo {
  name: string
  kind: 'daily' | 'restore' | 'import' // restore/import are the safety copies made before those actions
  date: string // yyyy-mm-dd for daily backups, a full ISO time for safety copies
  items: number
  bytes: number
}

// Settings that hold secrets. The key itself never comes back to the window.
export interface SettingsStatus {
  tmdb: { hasKey: boolean; hint?: string } // hint: the last four characters
  encryption: boolean // whether this computer can store a key securely
}

export type KeyCheck = { ok: true } | { ok: false; error: string }

// Result of choosing an image for an item: its stored file name, or a reason it failed.
export type ImagePick = { fileName: string } | { error: string } | null

export interface ShelfApi {
  library: {
    load(): Promise<LoadResult>
    save(library: Library): Promise<void>
  }
  images: {
    pick(itemId: string): Promise<ImagePick>
    remove(fileName: string): Promise<void>
  }
  data: {
    exportLibrary(): Promise<ExportResult | null>
    pickImport(): Promise<ImportPreview | { error: string } | null>
    commitImport(mode: ImportMode): Promise<DataImportSummary>
    listBackups(): Promise<BackupInfo[]>
    restoreBackup(name: string): Promise<Library>
    openDataFolder(): Promise<void>
  }
  settings: {
    status(): Promise<SettingsStatus>
    saveTmdbKey(key: string): Promise<KeyCheck>
    clearTmdbKey(): Promise<void>
    testTmdbKey(): Promise<KeyCheck>
  }
  importV1: {
    pickFolder(): Promise<V1Scan | null>
    commit(sagaAs: Record<string, SagaKind>): Promise<ImportSummary>
  }
}
