// Keeps a private copy of each card image in the app's own folder, so the
// original file can be moved or deleted. Plain file operations on a folder
// passed in, so it can be tested without Electron.
//
// - one image per item: the file name starts with the item's id
// - every copy gets a fresh random suffix, so a replaced image never shows a
//   stale cached version
// - only names in the exact format below are ever touched

import { randomBytes } from 'node:crypto'
import { constants, promises as fs } from 'node:fs'
import { extname, join } from 'node:path'

export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif']
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024
export const IMAGE_NAME = /^[0-9a-f-]{36}-[0-9a-f]{6}\.(png|jpg|jpeg|webp|gif)$/
const ITEM_ID = /^[0-9a-f-]{36}$/

export interface ImageStore {
  importFile(sourcePath: string, itemId: string): Promise<string>
  remove(fileName: string): Promise<void>
  removeUnused(keep: ReadonlySet<string>, minAgeMs?: number): Promise<number>
  read(fileName: string): Promise<Buffer | null>
  exists(fileName: string): Promise<boolean>
  writeCopy(fileName: string, data: Buffer): Promise<void>
  pathOf(fileName: string): string | null
}

export function createImageStore(dir: string, suffix: () => string = () => randomBytes(3).toString('hex')): ImageStore {
  return {
    async importFile(sourcePath, itemId) {
      if (!ITEM_ID.test(itemId)) throw new Error('Invalid item.')
      const extension = extname(sourcePath).slice(1).toLowerCase()
      if (!IMAGE_EXTENSIONS.includes(extension)) throw new Error('Choose a PNG, JPG, WEBP or GIF image.')
      const info = await fs.stat(sourcePath)
      if (info.size > MAX_IMAGE_BYTES) throw new Error('That image is larger than 15 MB.')
      await fs.mkdir(dir, { recursive: true })
      const fileName = `${itemId}-${suffix()}.${extension}`
      await fs.copyFile(sourcePath, join(dir, fileName), constants.COPYFILE_EXCL)
      return fileName
    },

    async remove(fileName) {
      if (IMAGE_NAME.test(fileName)) await fs.rm(join(dir, fileName), { force: true })
    },

    // Deletes copies that no item uses any more, once they are at least minAgeMs
    // old (so a recent undo or a restore can still find them). Returns how many.
    async removeUnused(keep, minAgeMs = 0) {
      let names: string[]
      try {
        names = await fs.readdir(dir)
      } catch {
        return 0
      }
      let removed = 0
      for (const name of names) {
        if (!IMAGE_NAME.test(name) || keep.has(name)) continue
        const info = await fs.stat(join(dir, name))
        if (minAgeMs > 0 && Date.now() - info.mtimeMs < minAgeMs) continue
        await fs.rm(join(dir, name), { force: true })
        removed += 1
      }
      return removed
    },

    async read(fileName) {
      if (!IMAGE_NAME.test(fileName)) return null
      try {
        return await fs.readFile(join(dir, fileName))
      } catch {
        return null
      }
    },

    async exists(fileName) {
      if (!IMAGE_NAME.test(fileName)) return false
      try {
        await fs.access(join(dir, fileName))
        return true
      } catch {
        return false
      }
    },

    // Stores image bytes that came from an import, under a name that is already
    // in the app's format. Never replaces a file that is there.
    async writeCopy(fileName, data) {
      if (!IMAGE_NAME.test(fileName)) throw new Error('Invalid image name.')
      if (data.length > MAX_IMAGE_BYTES) throw new Error('That image is larger than 15 MB.')
      await fs.mkdir(dir, { recursive: true })
      try {
        await fs.writeFile(join(dir, fileName), data, { flag: 'wx' })
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      }
    },

    pathOf(fileName) {
      return IMAGE_NAME.test(fileName) ? join(dir, fileName) : null
    }
  }
}
