// Shelf data model. One unified item type replaces V1's four separate lists
// (movies, series, books, wishlist). Shared by the main process and the UI.

export type MediaType = 'movie' | 'series' | 'book'

// "wishlist" replaces V1's separate Wishlist list: marking an item as
// finished is what moves it into the library.
export type Status = 'wishlist' | 'in-progress' | 'finished'

export interface MediaItem {
  id: string // uuid, stable across edits and exports
  type: MediaType
  status: Status
  title: string
  year?: number

  // Grouping. These are two different ideas that V1 mixed together:
  genres: string[] // many per item: ["Horror", "Thriller"]  (V1 "Saga")
  franchise?: string // one per item: "The Lord of the Rings"
  franchiseOrder?: number // position inside the franchise / book series
  collection?: string // a group above franchises or people: "Marvel", "Keanu Reeves"

  // Tracking
  // ISO dates (yyyy-mm-dd) each time it was seen or read. May be empty: an
  // item can be finished without a date (seen long ago). Status is the truth.
  dates: string[]
  rating?: number // 0 to 10, half points allowed
  isFavorite: boolean
  notes?: string
  color?: string // optional accent override, "#rrggbb" (imported from V1)
  image?: string // file name of the card image in the app's images folder; one per item

  // Type-specific (only meaningful for that type)
  yearEnd?: number // series
  seasons?: number // series
  author?: string // book

  createdAt: string // ISO timestamp

  // Everything that comes from the optional metadata lookup lives under
  // this single key, so removing the feature never touches the core model.
  meta?: ExternalMeta
}

export interface ExternalMeta {
  source: 'tmdb' | 'openlibrary'
  externalId: string // an approved poster is saved as the item's own image
  overview?: string
  approvedAt: string // set only after the user approved the match
}

export interface Library {
  version: 1
  items: MediaItem[]
}
