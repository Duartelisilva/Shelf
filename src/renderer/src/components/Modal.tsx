import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], summary, [tabindex]:not([tabindex="-1"])'

interface Props {
  label: string
  onClose: () => void
  children: React.ReactNode
  widthClass?: string
  alert?: boolean // a question that needs an answer (delete, replace...)
  closeOnBackdrop?: boolean
}

// The frame of every dialog. It moves the keyboard focus inside when it opens,
// keeps Tab from leaving it, closes on Escape and gives the focus back to what
// had it before. A dialog opened from another dialog (the lookup, inside Add)
// handles its own keys first, so Escape closes only the top one.
export function Modal({
  label,
  onClose,
  children,
  widthClass = 'w-[520px]',
  alert = false,
  closeOnBackdrop = false
}: Props): React.JSX.Element {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    const element = panel.current
    if (element && !element.contains(document.activeElement)) {
      ;(element.querySelector<HTMLElement>(FOCUSABLE) ?? element).focus()
    }
    return () => before?.focus()
  }, [])

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60"
      // Pressing on the dimmed area must not take the keyboard focus away from the
      // dialog, otherwise Escape and Tab would stop reaching it.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) e.preventDefault()
      }}
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
          return
        }
        const element = panel.current
        if (e.key !== 'Tab' || !element) return
        e.stopPropagation()
        const list = [...element.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
          (el) => el.offsetParent !== null
        )
        if (list.length === 0) {
          e.preventDefault()
          return
        }
        const active = document.activeElement
        const outside = !element.contains(active)
        if (e.shiftKey && (active === list[0] || outside)) {
          e.preventDefault()
          list[list.length - 1].focus()
        } else if (!e.shiftKey && (active === list[list.length - 1] || outside)) {
          e.preventDefault()
          list[0].focus()
        }
      }}
    >
      <div
        ref={panel}
        role={alert ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`flex max-h-[92vh] flex-col gap-4 overflow-y-auto rounded-2xl border border-line bg-panel p-6 outline-none ${widthClass}`}
      >
        {children}
      </div>
    </div>
  )
}
