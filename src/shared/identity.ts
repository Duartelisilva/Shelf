// What makes two items "the same item": the same type, title, year and franchise.
// Capitals and extra spaces do not count. Two series with the same name and year
// can both exist when they belong to different franchises. One rule, used by the
// Add dialog, the editing fields, the lookup and both importers.

export interface IdentityFields {
  type: string
  title: string
  year?: number
  franchise?: string
}

const clean = (text: string): string => text.trim().replace(/\s+/g, ' ').toLowerCase()

export function itemKey(item: IdentityFields): string {
  return `${item.type}|${clean(item.title)}|${item.year ?? ''}|${clean(item.franchise ?? '')}`
}
