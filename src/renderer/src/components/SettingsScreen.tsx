import type { ThemeChoice } from '../../../shared/themes'
import type { Library, MediaItem } from '../../../shared/types'
import { AppearanceSection } from './AppearanceSection'
import { DataSection } from './DataSection'
import { ImportPanel } from './ImportPanel'
import { MetadataSection } from './MetadataSection'
import { NamesSection } from './NamesSection'

interface Props {
  theme: ThemeChoice
  onTheme: (theme: ThemeChoice) => void
  items: MediaItem[]
  onItemsChange: (items: MediaItem[], undoLabel: string) => void
  onLibraryChanged: (library: Library) => void
}

export function SettingsScreen({
  theme,
  onTheme,
  items,
  onItemsChange,
  onLibraryChanged
}: Props): React.JSX.Element {
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <h1 className="text-[28px] font-extrabold">Settings</h1>
      <div className="mt-6 flex max-w-3xl flex-col gap-6">
        <AppearanceSection theme={theme} onTheme={onTheme} />
        <DataSection onLibraryChanged={onLibraryChanged} />
        <NamesSection items={items} onItemsChange={onItemsChange} />
        <MetadataSection />
        <ImportPanel onImported={onLibraryChanged} />
      </div>
    </div>
  )
}
