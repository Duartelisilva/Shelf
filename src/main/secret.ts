import { safeStorage } from 'electron'
import type { SecretBox } from './settings'

// The operating system's secure storage (on Windows it is tied to your account).
export function createSecretBox(): SecretBox {
  return {
    available: () => safeStorage.isEncryptionAvailable(),
    encrypt: (text) => safeStorage.encryptString(text).toString('base64'),
    decrypt: (encoded) => safeStorage.decryptString(Buffer.from(encoded, 'base64'))
  }
}
