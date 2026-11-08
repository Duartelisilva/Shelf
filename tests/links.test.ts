import { describe, expect, it } from 'vitest'
import { isAppUrl, isSafeExternalUrl } from '../src/main/links'

describe('links', () => {
  it('opens web links in the browser, and nothing else', () => {
    expect(isSafeExternalUrl('https://www.themoviedb.org/settings/api')).toBe(true)
    for (const bad of [
      'http://example.com',
      'file:///C:/Windows/notepad.exe',
      'javascript:alert(1)',
      'ms-msdt:/id',
      'not a url',
      ''
    ]) {
      expect(isSafeExternalUrl(bad)).toBe(false)
    }
  })

  it('lets the window stay on its own page only', () => {
    expect(isAppUrl('http://localhost:5173/', 'http://localhost:5173')).toBe(true)
    expect(isAppUrl('file:///C:/app/index.html', 'file://')).toBe(true)
    expect(isAppUrl('https://evil.example/', 'http://localhost:5173')).toBe(false)
    expect(isAppUrl('https://evil.example/', 'file://')).toBe(false)
  })
})
