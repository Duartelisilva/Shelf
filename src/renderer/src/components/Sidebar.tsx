import type { Section } from '../lib/library'
import { SECTION_TITLES } from '../lib/library'

interface Props {
  section: Section
  counts: Record<Section, number>
  importing: boolean
  onSection: (section: Section) => void
  onImport: () => void
}

const GROUPS: Section[][] = [['library', 'movie', 'series', 'book'], ['wishlist', 'favorites']]

export function Sidebar({ section, counts, importing, onSection, onImport }: Props): React.JSX.Element {
  const row = 'flex w-full justify-between rounded-lg px-3 py-2.5 text-left'
  return (
    <nav className="flex w-[220px] flex-none flex-col gap-1 border-r border-line bg-panel px-3.5 py-6">
      <div className="px-2.5 pb-5 text-xl font-extrabold">Shelf</div>
      {GROUPS.map((group, index) => (
        <div key={index} className="flex flex-col gap-1">
          {index > 0 && <div className="mx-2 my-2.5 h-px bg-line" />}
          {group.map((s) => {
            const active = !importing && s === section
            return (
              <button
                key={s}
                type="button"
                onClick={() => onSection(s)}
                aria-current={active ? 'page' : undefined}
                className={`${row} cursor-pointer ${
                  active ? 'bg-accent-soft font-bold text-accent' : 'text-muted hover:text-ink'
                }`}
              >
                <span>{SECTION_TITLES[s]}</span>
                <span>{counts[s]}</span>
              </button>
            )
          })}
        </div>
      ))}
      <button type="button" disabled className={`${row} mt-1 cursor-not-allowed text-muted opacity-50`}>
        <span>Stats</span>
        <span className="text-xs">soon</span>
      </button>
      <div className="flex-1" />
      <button
        type="button"
        onClick={onImport}
        className={`cursor-pointer rounded-lg border px-3 py-2.5 text-left ${
          importing ? 'border-accent text-accent' : 'border-edge text-muted hover:text-ink'
        }`}
      >
        Import from V1…
      </button>
    </nav>
  )
}
