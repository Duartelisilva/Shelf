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
