// Electron side of card images: the file picker, and a private "shelf-image://"
// address the window uses to show stored images (the window is not allowed to
// open files on disk directly).

import { app, BrowserWindow, dialog, net, protocol } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { ImagePick } from '../shared/api'
import { IMAGE_EXTENSIONS, createImageStore } from './imageStore'
import type { ImageStore } from './imageStore'

const SCHEME = 'shelf-image'

// Must run before the app is ready, which is why it sits at the top of the file.
protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }
])

export interface Images {
  store: ImageStore
  pick(itemId: string): Promise<ImagePick>
}

export function createImages(): Images {
  const store = createImageStore(join(app.getPath('userData'), 'images'))

  protocol.handle(SCHEME, (request) => {
    const fileName = decodeURIComponent(new URL(request.url).pathname.slice(1))
    const file = store.pathOf(fileName) // null unless it is a name we created
    if (!file) return new Response('Not found', { status: 404 })
    return net.fetch(pathToFileURL(file).toString())
  })

  return {
    store,
    async pick(itemId) {
      const options = {
        title: 'Choose an image',
        properties: ['openFile' as const],
        filters: [{ name: 'Images', extensions: IMAGE_EXTENSIONS }]
      }
      const parent = BrowserWindow.getFocusedWindow()
      const picked = parent
        ? await dialog.showOpenDialog(parent, options)
        : await dialog.showOpenDialog(options)
      if (picked.canceled || picked.filePaths.length === 0) return null
      try {
        return { fileName: await store.importFile(picked.filePaths[0], itemId) }
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'The image could not be saved.' }
      }
    }
  }
}
