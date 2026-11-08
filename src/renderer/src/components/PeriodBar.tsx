import { Button } from './ui'

interface Props {
  canPrevious: boolean
  canNext: boolean
  onPrevious: () => void
  onNext: () => void
  children: React.ReactNode // the selectors of the page
}

// Previous and next buttons around the period selectors of a statistics page.
export function PeriodBar({
  canPrevious,
  canNext,
  onPrevious,
  onNext,
  children
}: Props): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button label="Previous" className="w-10 !px-0" disabled={!canPrevious} onClick={onPrevious}>
        ‹
      </Button>
      {children}
      <Button label="Next" className="w-10 !px-0" disabled={!canNext} onClick={onNext}>
        ›
      </Button>
    </div>
  )
}
