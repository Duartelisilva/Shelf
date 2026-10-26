import type { Library } from '../../../shared/types'
import { DataSection } from './DataSection'
import { ImportPanel } from './ImportPanel'
import { MetadataSection } from './MetadataSection'

interface Props {
  onLibraryChanged: (library: Library) => void
}

export function SettingsScreen({ onLibraryChanged }: Props): React.JSX.Element {
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <h1 className="text-[28px] font-extrabold">Settings</h1>
      <div className="mt-6 flex max-w-3xl flex-col gap-6">
        <DataSection onLibraryChanged={onLibraryChanged} />
        <MetadataSection />
        <ImportPanel onImported={onLibraryChanged} />
      </div>
    </div>
  )
}
