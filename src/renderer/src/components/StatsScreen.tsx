import { useState } from 'react'
import type { MediaItem } from '../../../shared/types'
import { MonthReviewScreen } from './MonthReviewScreen'
import { OverviewStats } from './OverviewStats'
import { Segmented } from './ui'
import { YearReviewScreen } from './YearReviewScreen'

type Tab = 'overview' | 'year' | 'month'

// Three views of the same data: everything at once, one year, one month.
export function StatsScreen({ items }: { items: MediaItem[] }): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('overview')
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="flex items-center gap-4">
        <h1 className="text-[28px] font-extrabold">Stats</h1>
        <Segmented
          label="Statistics page"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'overview', label: 'Overview' },
            { value: 'year', label: 'Year in review' },
            { value: 'month', label: 'Month' }
          ]}
        />
      </div>
      {tab === 'overview' && <OverviewStats items={items} />}
      {tab === 'year' && <YearReviewScreen items={items} />}
      {tab === 'month' && <MonthReviewScreen items={items} />}
    </div>
  )
}
