import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import type { CaseTrack } from '@/lib/api/types'
import type { AnalyticsFilters } from './api'

const TRACKS: CaseTrack[] = [
  'fast_track',
  'dispatch_required',
  'police_required',
]

/** Filters sit in one row above the charts, never between them. */
export function AnalyticsFilterBar({
  filters,
  onChange,
}: {
  filters: AnalyticsFilters
  onChange: (next: AnalyticsFilters) => void
}) {
  const { t } = useTranslation()

  const dirty = Boolean(filters.from || filters.to || filters.track)

  return (
    <div className="flex flex-wrap items-end gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="from" className="text-sm font-medium text-foreground">
          {t('dashboards.filters.from')}
        </label>
        <input
          id="from"
          type="date"
          value={filters.from ?? ''}
          onChange={(event) =>
            onChange({ ...filters, from: event.target.value || undefined })
          }
          dir="ltr"
          className="min-h-11 rounded-xl border border-border bg-background px-4 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="to" className="text-sm font-medium text-foreground">
          {t('dashboards.filters.to')}
        </label>
        <input
          id="to"
          type="date"
          value={filters.to ?? ''}
          onChange={(event) =>
            onChange({ ...filters, to: event.target.value || undefined })
          }
          dir="ltr"
          className="min-h-11 rounded-xl border border-border bg-background px-4 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="track" className="text-sm font-medium text-foreground">
          {t('dashboards.filters.track')}
        </label>
        <select
          id="track"
          value={filters.track ?? ''}
          onChange={(event) =>
            onChange({ ...filters, track: event.target.value || undefined })
          }
          className="min-h-11 rounded-xl border border-border bg-background px-4 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        >
          <option value="">{t('dashboards.filters.allTracks')}</option>
          {TRACKS.map((track) => (
            <option key={track} value={track}>
              {t(`caseTrack.${track}`)}
            </option>
          ))}
        </select>
      </div>

      {dirty ? (
        <Button variant="ghost" onClick={() => onChange({})}>
          {t('dashboards.filters.clear')}
        </Button>
      ) : null}
    </div>
  )
}
