import logo from '../assets/logo.svg'

// Shown while the library is being read, in the colours of the chosen theme.
// It only appears for as long as the loading really takes.
export function LoadingScreen(): React.JSX.Element {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-6"
      role="status"
      aria-live="polite"
    >
      <img src={logo} alt="" className="h-28 w-28" />
      <div className="text-3xl font-extrabold tracking-tight">Shelf</div>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-line">
        <div className="h-full w-1/3 animate-[shelf-loading_1.1s_ease-in-out_infinite] rounded-full bg-accent" />
      </div>
      <span className="sr-only">Loading your library…</span>
    </div>
  )
}
