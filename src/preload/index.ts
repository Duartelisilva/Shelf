import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { CHANNELS } from '../shared/api'
import type { ShelfApi } from '../shared/api'

// The only functions the window is allowed to call.
const api: ShelfApi = {
  library: {
    load: () => ipcRenderer.invoke(CHANNELS.libraryLoad),
    save: (library) => ipcRenderer.invoke(CHANNELS.librarySave, library)
  },
  images: {
    pick: (itemId) => ipcRenderer.invoke(CHANNELS.imagePick, itemId),
    remove: (fileName) => ipcRenderer.invoke(CHANNELS.imageRemove, fileName)
  },
  data: {
    exportLibrary: () => ipcRenderer.invoke(CHANNELS.dataExport),
    pickImport: () => ipcRenderer.invoke(CHANNELS.dataPickImport),
    commitImport: (mode) => ipcRenderer.invoke(CHANNELS.dataCommitImport, mode),
    listBackups: () => ipcRenderer.invoke(CHANNELS.dataListBackups),
    restoreBackup: (name) => ipcRenderer.invoke(CHANNELS.dataRestoreBackup, name),
    openDataFolder: () => ipcRenderer.invoke(CHANNELS.dataOpenFolder)
  },
  settings: {
    status: () => ipcRenderer.invoke(CHANNELS.settingsStatus),
    saveTmdbKey: (key) => ipcRenderer.invoke(CHANNELS.settingsSaveTmdbKey, key),
    clearTmdbKey: () => ipcRenderer.invoke(CHANNELS.settingsClearTmdbKey),
    testTmdbKey: () => ipcRenderer.invoke(CHANNELS.settingsTestTmdbKey)
  },
  metadata: {
    search: (type, query) => ipcRenderer.invoke(CHANNELS.metadataSearch, type, query),
    details: (type, source, id) => ipcRenderer.invoke(CHANNELS.metadataDetails, type, source, id),
    downloadPoster: (itemId, source, id) => ipcRenderer.invoke(CHANNELS.metadataPoster, itemId, source, id)
  },
  importV1: {
    pickFolder: () => ipcRenderer.invoke(CHANNELS.importPick),
    commit: (sagaAs) => ipcRenderer.invoke(CHANNELS.importCommit, sagaAs)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
