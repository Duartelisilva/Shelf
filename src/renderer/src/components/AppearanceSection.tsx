import { THEMES } from '../../../shared/themes'
import type { ThemeChoice, ThemeId } from '../../../shared/themes'

interface Props {
  theme: ThemeChoice
  onTheme: (theme: ThemeChoice) => void
}

// A small picture of the interface in one theme. The wrapper carries data-theme,
// so everything inside takes that theme's colours whichever theme is active.
function Swatch({ id, className = '' }: { id: ThemeId; className?: string }): React.JSX.Element {
  return (
    <div data-theme={id} className={`flex h-20 bg-ground ${className}`}>
      <div className="flex w-1/4 flex-col gap-1.5 bg-panel p-2">
        <div className="h-1.5 rounded-sm bg-accent" />
        <div className="h-1 rounded-sm bg-line" />
        <div className="h-1 rounded-sm bg-line" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2">
        <div className="h-1.5 w-2/3 rounded-sm bg-ink" />
        <div className="h-1 w-1/2 rounded-sm bg-muted" />
        <div className="mt-auto flex gap-1.5">
          <div className="h-6 w-4 rounded-sm bg-accent" />
          <div className="h-6 w-4 rounded-sm bg-surface" />
          <div className="h-6 w-4 rounded-sm bg-accent-soft" />
        </div>
      </div>
    </div>
  )
}

const CHOICES: { id: ThemeChoice; name: string }[] = [
  { id: 'system', name: 'Match Windows' },
  ...THEMES.map((t) => ({ id: t.id, name: t.name }))
]

export function AppearanceSection({ theme, onTheme }: Props): React.JSX.Element {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      <h2 className="text-base font-extrabold">Appearance</h2>
      <div className="grid grid-cols-3 gap-3" role="group" aria-label="Colour theme">
        {CHOICES.map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => onTheme(choice.id)}
            aria-pressed={theme === choice.id}
            className={`flex cursor-pointer flex-col gap-2 rounded-xl border p-2 text-left ${
              theme === choice.id ? 'border-accent outline-2 outline-accent' : 'border-edge hover:border-muted'
            }`}
          >
            {choice.id === 'system' ? (
              <div className="flex overflow-hidden rounded-lg border border-edge">
                <Swatch id="midnight" className="w-1/2" />
                <Swatch id="daylight" className="w-1/2" />
              </div>
            ) : (
              <Swatch id={choice.id} className="overflow-hidden rounded-lg border border-edge" />
            )}
            <span className={theme === choice.id ? 'font-bold text-accent' : ''}>{choice.name}</span>
          </button>
        ))}
      </div>
      <p className="text-sm text-muted">
        &quot;Match Windows&quot; uses Daylight when Windows is in light mode and Midnight when it is in dark mode, and
        follows it when it changes.
      </p>
    </section>
  )
}
