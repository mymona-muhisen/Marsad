import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { BarList, type BarDatum } from '@/components/charts/BarList'
import { StatTile } from '@/components/charts/StatTile'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { AnalyticsFilterBar } from './AnalyticsFilterBar'
import { blackSpotsQueryKey, fetchBlackSpots, type AnalyticsFilters } from './api'

export function BlackSpotsPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<AnalyticsFilters>({})

  const spots = useQuery({
    queryKey: [...blackSpotsQueryKey, filters],
    queryFn: () => fetchBlackSpots(filters),
  })

  const rows = spots.data?.data ?? []
  const total = rows.reduce((sum, row) => sum + row.count, 0)

  // The API already returns these ordered by count descending.
  const bars: BarDatum[] = rows.map((row) => ({
    key: row.region,
    label: row.region,
    value: row.count,
    display: `${row.count} ${t('dashboards.blackSpots.count')}`,
  }))

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('dashboards.blackSpots.title')}
        </h1>
        <p className="mt-3 text-sm leading-7 text-foreground/65">
          {t('dashboards.blackSpots.subtitle')}
        </p>
      </header>

      <AnalyticsFilterBar filters={filters} onChange={setFilters} />

      {spots.isPending ? (
        <p className="flex items-center gap-3 text-sm text-foreground/60">
          <Spinner className="size-4 text-primary" />
          {t('common.loading')}
        </p>
      ) : null}

      {spots.isError ? (
        <Alert tone="danger">
          {t('errors.network')}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => void spots.refetch()}
          >
            {t('common.retry')}
          </button>
        </Alert>
      ) : null}

      {spots.data && rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-foreground/60">
          {t('dashboards.blackSpots.empty')}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatTile
              label={t('dashboards.blackSpots.count')}
              value={total}
            />
            <StatTile
              label={t('dashboards.blackSpots.topRegion')}
              value={rows[0].count}
              hint={rows[0].region}
              tone="warning"
            />
          </div>

          <section className="flex flex-col gap-5 rounded-2xl border border-border p-6">
            <h2 className="text-lg font-semibold tracking-tight">
              {t('dashboards.blackSpots.title')}
            </h2>
            <BarList data={bars} />
          </section>

          <p className="text-xs leading-6 text-foreground/50">
            {t('dashboards.aggregateOnly')}
          </p>
        </>
      ) : null}
    </div>
  )
}
