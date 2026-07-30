import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { StatTile } from '@/components/charts/StatTile'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { AnalyticsFilterBar } from './AnalyticsFilterBar'
import {
  densityQueryKey,
  fetchDensity,
  type AnalyticsFilters,
  type DensityBucket,
} from './api'

const SIZE = 480
const PAD = 24

/**
 * Bucket density plotted at its own coordinates.
 *
 * Not a map, and labelled as such on the page: a base map needs an external
 * tile provider, which this platform deliberately avoids. What this does show
 * honestly is where the reported accidents cluster relative to each other —
 * position from lat/lng, magnitude from one sequential hue plus radius.
 */
function DensityPlot({
  buckets,
  label,
}: {
  buckets: DensityBucket[]
  label: string
}) {
  const [active, setActive] = useState<number | null>(null)
  const { t } = useTranslation()

  const lats = buckets.map((b) => b.lat)
  const lngs = buckets.map((b) => b.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  // A single bucket, or a row sharing one coordinate, would divide by zero.
  const span = (min: number, max: number) => (max - min === 0 ? 1 : max - min)
  const plot = SIZE - PAD * 2

  // Latitude increases northward; SVG y increases downward, so it inverts.
  const x = (lng: number) => PAD + ((lng - minLng) / span(minLng, maxLng)) * plot
  const y = (lat: number) =>
    PAD + plot - ((lat - minLat) / span(minLat, maxLat)) * plot

  const ceiling = Math.max(...buckets.map((b) => b.count), 1)
  const radius = (count: number) => 5 + (count / ceiling) * 13
  const fill = (count: number) => {
    const ratio = count / ceiling
    if (ratio > 0.8) return 'var(--seq-5)'
    if (ratio > 0.6) return 'var(--seq-4)'
    if (ratio > 0.4) return 'var(--seq-3)'
    if (ratio > 0.2) return 'var(--seq-2)'
    return 'var(--seq-1)'
  }

  const activeBucket = active === null ? null : buckets[active]

  return (
    <figure className="m-0 flex flex-col gap-3">
      <div dir="ltr" className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-auto w-full max-w-lg"
          role="img"
          aria-label={label}
        >
          <rect
            x={PAD}
            y={PAD}
            width={plot}
            height={plot}
            fill="none"
            stroke="var(--chart-grid)"
            strokeWidth="1"
          />

          {/* Largest first, so a dense bucket never hides a sparse one. */}
          {[...buckets]
            .map((bucket, index) => ({ bucket, index }))
            .sort((a, b) => b.bucket.count - a.bucket.count)
            .map(({ bucket, index }) => (
              <circle
                key={`${bucket.lat}|${bucket.lng}`}
                cx={x(bucket.lng)}
                cy={y(bucket.lat)}
                r={radius(bucket.count)}
                fill={fill(bucket.count)}
                fillOpacity="0.75"
                stroke="var(--background)"
                strokeWidth="2"
                tabIndex={0}
                role="button"
                aria-label={`${bucket.lat}, ${bucket.lng}: ${bucket.count}`}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                onBlur={() => setActive(null)}
                className="cursor-pointer"
              />
            ))}
        </svg>
      </div>

      <figcaption
        className="min-h-6 text-sm text-foreground/70"
        aria-live="polite"
      >
        {activeBucket ? (
          <span dir="ltr" className="tabular-nums">
            {activeBucket.lat}, {activeBucket.lng} — {activeBucket.count}{' '}
            {t('dashboards.density.accidents')}
          </span>
        ) : (
          <span className="text-foreground/45">{label}</span>
        )}
      </figcaption>
    </figure>
  )
}

export function DensityPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<AnalyticsFilters>({})

  const density = useQuery({
    queryKey: [...densityQueryKey, filters],
    queryFn: () => fetchDensity(filters),
  })

  const buckets = density.data?.data ?? []
  const totalAccidents = buckets.reduce((sum, b) => sum + b.count, 0)
  const busiest = buckets.reduce<DensityBucket | null>(
    (best, b) => (best === null || b.count > best.count ? b : best),
    null,
  )

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('dashboards.density.title')}
        </h1>
        <p className="mt-3 text-sm leading-7 text-foreground/65">
          {t('dashboards.density.subtitle')}
        </p>
      </header>

      <AnalyticsFilterBar filters={filters} onChange={setFilters} />

      {density.isPending ? (
        <p className="flex items-center gap-3 text-sm text-foreground/60">
          <Spinner className="size-4 text-primary" />
          {t('common.loading')}
        </p>
      ) : null}

      {density.isError ? (
        <Alert tone="danger">
          {t('errors.network')}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => void density.refetch()}
          >
            {t('common.retry')}
          </button>
        </Alert>
      ) : null}

      {density.data && buckets.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-foreground/60">
          {t('dashboards.density.empty')}
        </p>
      ) : null}

      {buckets.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile
              label={t('dashboards.density.accidents')}
              value={totalAccidents}
            />
            <StatTile
              label={t('dashboards.density.buckets')}
              value={buckets.length}
            />
            <StatTile
              label={t('dashboards.density.busiest')}
              value={busiest?.count ?? 0}
              hint={
                busiest ? (
                  <span dir="ltr" className="tabular-nums">
                    {busiest.lat}, {busiest.lng}
                  </span>
                ) : undefined
              }
            />
          </div>

          {/* Said plainly rather than implied by a map-shaped frame. */}
          <Alert tone="info">{t('dashboards.density.notAMap')}</Alert>

          <section className="rounded-2xl border border-border p-6">
            <DensityPlot
              buckets={buckets}
              label={t('dashboards.density.title')}
            />
          </section>

          <details className="rounded-2xl border border-border p-5">
            <summary className="cursor-pointer text-sm font-medium">
              {t('dashboards.tableView')}
            </summary>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-foreground/55">
                    <th scope="col" className="p-3 text-start font-medium">
                      {t('dashboards.density.table.lat')}
                    </th>
                    <th scope="col" className="p-3 text-start font-medium">
                      {t('dashboards.density.table.lng')}
                    </th>
                    <th scope="col" className="p-3 text-start font-medium">
                      {t('dashboards.density.table.count')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...buckets]
                    .sort((a, b) => b.count - a.count)
                    .map((bucket) => (
                      <tr
                        key={`${bucket.lat}|${bucket.lng}`}
                        className="border-b border-border/60"
                      >
                        <td className="p-3 tabular-nums" dir="ltr">
                          {bucket.lat}
                        </td>
                        <td className="p-3 tabular-nums" dir="ltr">
                          {bucket.lng}
                        </td>
                        <td className="p-3 tabular-nums" dir="ltr">
                          {bucket.count}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </details>

          <p className="text-xs leading-6 text-foreground/50">
            {t('dashboards.aggregateOnly')}
          </p>
        </>
      ) : null}
    </div>
  )
}
