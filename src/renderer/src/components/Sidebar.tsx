import type { Section } from '../lib/library'
import { SECTION_TITLES } from '../lib/library'

export type View = 'library' | 'import' | 'stats'

interface Props {
  view: View
  section: Section
  counts: Record<Section, number>
  onSection: (section: Section) => void
  onView: (view: 'import' | 'stats') => void
}

const GROUPS: Section[][] = [['library', 'movie', 'series', 'book'], ['wishlist', 'favorites']]
const row = 'flex w-full cursor-pointer justify-between rounded-lg px-3 py-2.5 text-left'
const active = 'bg-accent-soft font-bold text-accent'
const idle = 'text-muted hover:text-ink'

export function Sidebar({ view, section, counts, onSection, onView }: Props): React.JSX.Element {
  return (
    <nav className="flex w-[220px] flex-none flex-col gap-1 border-r border-line bg-panel px-3.5 py-6">
      <div className="px-2.5 pb-5 text-xl font-extrabold">Shelf</div>
      {GROUPS.map((group, index) => (
        <div key={index} className="flex flex-col gap-1">
          {index > 0 && <div className="mx-2 my-2.5 h-px bg-line" />}
          {group.map((s) => {
            const on = view === 'library' && s === section
            return (
              <button
                key={s}
                type="button"
                onClick={() => onSection(s)}
                aria-current={on ? 'page' : undefined}
                className={`${row} ${on ? active : idle}`}
              >
                <span>{SECTION_TITLES[s]}</span>
                <span>{counts[s]}</span>
              </button>
            )
          })}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onView('stats')}
        aria-current={view === 'stats' ? 'page' : undefined}
        className={`${row} mt-1 ${view === 'stats' ? active : idle}`}
      >
        <span>Stats</span>
      </button>
      <div className="flex-1" />
      <button
        type="button"
        onClick={() => onView('import')}
        className={`cursor-pointer rounded-lg border px-3 py-2.5 text-left ${
          view === 'import' ? 'border-accent text-accent' : 'border-edge text-muted hover:text-ink'
        }`}
      >
        Import from V1…
      </button>
    </nav>
  )
}
