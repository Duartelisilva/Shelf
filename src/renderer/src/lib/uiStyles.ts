// The small kit every screen is built from, so that all buttons, inputs and
// toggles look and size the same. Colours come from the theme tokens; sizes,
// radius and weights are decided here and nowhere else.
//
//   md = 40px tall (top bar, dialogs, settings)
//   sm = 32px tall (inside forms and panels)

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerGhost'

export type ButtonSize = 'md' | 'sm'

const BASE =
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40'

const SIZES: Record<ButtonSize, string> = {
  md: 'h-10 px-4 text-sm',
  sm: 'h-8 px-3 text-[13px]'
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:brightness-110',
  secondary: 'border border-edge text-ink hover:border-muted',
  ghost: 'text-muted hover:text-ink',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  dangerGhost: 'text-danger hover:underline'
}

export function buttonClass(
  variant: ButtonVariant = 'secondary',
  size: ButtonSize = 'md',
  extra = ''
): string {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${extra}`.trim()
}

// A button that is either on or off (Favorites, Edit several...).
export function toggleClass(pressed: boolean, size: ButtonSize = 'md', extra = ''): string {
  const state = pressed
    ? 'border border-transparent bg-accent-soft text-accent'
    : 'border border-edge text-muted hover:text-ink'

  return `${BASE} ${SIZES[size]} ${state} ${extra}`.trim()
}
