// The contract between the app window (renderer) and the background process
// (main). The renderer never touches files directly: it can only call these.

import type { Library } from './types'
import type { SagaKind } from './importV1'

export const CHANNELS = {
  libraryLoad: 'library:load',
  librarySave: 'library:save',
  importPick: 'importV1:pick',
  importCommit: 'importV1:commit'
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

export interface ShelfApi {
  library: {
    load(): Promise<LoadResult>
    save(library: Library): Promise<void>
  }
  importV1: {
    pickFolder(): Promise<V1Scan | null>
    commit(sagaAs: Record<string, SagaKind>): Promise<ImportSummary>
  }
}
