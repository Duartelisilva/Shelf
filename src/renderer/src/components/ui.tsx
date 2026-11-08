// The small kit every screen is built from, so that all buttons, inputs and
// toggles look and size the same. Colours come from the theme tokens; sizes,
// radius and weights are decided here and nowhere else.
//
//   md = 40px tall (top bar, dialogs, settings)   sm = 32px tall (inside forms and panels)
import { buttonClass, toggleClass } from '../lib/uiStyles'
import type { ButtonSize, ButtonVariant } from '../lib/uiStyles'

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  type?: 'button' | 'submit'
  disabled?: boolean
  autoFocus?: boolean
  title?: string
  label?: string // the accessible name, for buttons that only show a symbol
  className?: string
  pressed?: boolean // makes it a toggle
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  size = 'md',
  type = 'button',
  disabled,
  autoFocus,
  title,
  label,
  className = '',
  pressed
}: ButtonProps): React.JSX.Element {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      autoFocus={autoFocus}
      title={title}
      aria-label={label}
      aria-pressed={pressed}
      className={
        pressed === undefined
          ? buttonClass(variant, size, className)
          : toggleClass(pressed, size, className)
      }
    >
      {children}
    </button>
  )
}

interface SegmentedProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  size?: ButtonSize
  className?: string
}

// Two or more choices side by side, exactly one selected (Grid / List, Wishlist / Seen...).
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = 'md',
  className = ''
}: SegmentedProps<T>): React.JSX.Element {
  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex ${size === 'md' ? 'h-10' : 'h-8'} shrink-0 overflow-hidden rounded-lg border border-edge ${className}`}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`flex-1 cursor-pointer whitespace-nowrap px-3 text-sm ${
            value === option.value
              ? 'bg-accent-soft font-bold text-accent'
              : 'text-muted hover:text-ink'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

// Form controls: same height as md buttons, same radius and border.
export const inputClass = 'h-10 w-full rounded-lg border border-edge bg-surface px-3 text-ink'
export const selectClass = 'h-10 rounded-lg border border-edge bg-surface px-3 text-ink'
export const textareaClass = 'w-full rounded-lg border border-edge bg-surface px-3 py-2 text-ink'
export const labelClass = 'text-xs font-extrabold tracking-wide text-muted uppercase'

// The boxes the statistics pages are made of.
export const panelClass =
  'flex min-w-[360px] flex-1 flex-col gap-3.5 rounded-xl border border-line bg-surface p-5'
export const headingClass = 'text-base font-extrabold'
