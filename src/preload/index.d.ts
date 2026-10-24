import { ElectronAPI } from '@electron-toolkit/preload'
import type { ShelfApi } from '../shared/api'

declare global {
  interface Window {
    electron: ElectronAPI
    api: ShelfApi
  }
}
