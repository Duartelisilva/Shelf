// Decides which addresses the window may open or go to. Kept apart from the
// Electron code so the rules can be tested.

// Links clicked inside the app (for example to the TMDB page where you find your
// key) open in the default browser, and only web links do: never a file, a
// script or another program's address.
export function isSafeExternalUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}

// The window itself may only stay on the app's own page. appUrl is the address of
// the development server, or "file://" in the packaged app.
export function isAppUrl(url: string, appUrl: string): boolean {
  return url.startsWith(appUrl)
}
