import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerIpc } from './ipc'
import { isAppUrl, isSafeExternalUrl } from './links'

let mainWindow: BrowserWindow | null = null

// The development server in development, the packaged files otherwise.
const rendererUrl = is.dev ? process.env['ELECTRON_RENDERER_URL'] : undefined

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    // Below this the layout would have to squeeze its controls.
    minWidth: 980,
    minHeight: 620,
    show: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  mainWindow = window

  window.on('ready-to-show', () => {
    window.show()
  })
  window.on('closed', () => {
    mainWindow = null
  })

  // Links open in the browser (web links only), and the window itself never
  // navigates away from the app.
  window.webContents.setWindowOpenHandler((details) => {
    if (isSafeExternalUrl(details.url)) void shell.openExternal(details.url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, url) => {
    if (!isAppUrl(url, rendererUrl ?? 'file://')) event.preventDefault()
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (rendererUrl) {
    void window.loadURL(rendererUrl)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Only one Shelf at a time. Two windows would each keep their own copy of the
// library and overwrite each other's changes, and a portable exe is easy to
// start twice by accident. Starting it again brings the open window forward.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  void app.whenReady().then(() => {
    // The identity Windows uses for the taskbar and notifications
    electronApp.setAppUserModelId('com.duartelisilva.shelf')

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    registerIpc()

    createWindow()

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
