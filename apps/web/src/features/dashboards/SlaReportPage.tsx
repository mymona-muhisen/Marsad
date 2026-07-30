import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { BarList, type BarDatum } from '@/components/charts/BarList'
import { StatTile } from '@/components/charts/StatTile'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { fetchSlaReport, slaReportQueryKey } from './api'

const rate = (breached: number, total: number) =>
  total === 0 ? 0 : Math.round((breached / total) * 100)

export function SlaReportPage() {
  const { t } = useTranslation()

  const report = useQuery({
    queryKey: slaReportQueryKey,
    queryFn: fetchSlaReport,
  })

  const rows = report.data?.data ?? []

  const totalClaims = rows.reduce((sum, row) => sum + row.claims_count, 0)
  const totalBreached = rows.reduce((sum, row) => sum + row.breached_count, 0)

  const settled = rows.filter((row) => row.average_settlement_hours !== null)
  const avgHours =
    settled.length === 0
      ? null
      : Math.round(
          settled.reduce(
            (sum, row) => sum + (row.average_settlement_hours ?? 0),
            0,
          ) / settled.length,
        )

  // Ranked worst-first: a compliance view exists to surface the offenders.
  const ranked = [...rows].sort(
    (a, b) =>
      rate(b.breached_count, b.claims_count) -
      rate(a.breached_count, a.claims_count),
  )

  const bars: BarDatum[] = ranked.map((row) => ({
    key: String(row.insurer_org_id),
    label: row.insurer_name,
    value: rate(row.breached_count, row.claims_count),
    display: `${rate(row.breached_count, row.claims_count)}% · ${t(
      'dashboards.sla.breachRateOf',
      { breached: row.breached_count, total: row.claims_count },
    )}`,
  }))

  // Only the leader is flagged, and only when it has actual breaches — a red bar
  // on a company with none would be a lie told by colour.
  const worst = ranked[0]
  const flagged =
    worst && worst.breached_count > 0 ? [String(worst.insurer_org_id)] : []

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('dashboards.sla.title')}
        </h1>
        <p className="mt-3 text-sm leading-7 text-foreground/65">
          {t('dashboards.sla.subtitle')}
        </p>
      </header>

      {report.isPending ? (
        <p className="flex items-center gap-3 text-sm text-foreground/60">
          <Spinner className="size-4 text-primary" />
          {t('common.loading')}
        </p>
      ) : null}

      {report.isError ? (
        <Alert tone="danger">
          {t('errors.network')}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => void report.refetch()}
          >
            {t('common.retry')}
          </button>
        </Alert>
      ) : null}

      {report.data && rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-foreground/60">
          {t('dashboards.sla.empty')}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label={t('dashboards.sla.totalClaims')}
              value={totalClaims}
            />
            <StatTile
              label={t('dashboards.sla.totalBreached')}
              value={totalBreached}
              tone={totalBreached > 0 ? 'critical' : 'good'}
            />
            <StatTile
              label={t('dashboards.sla.breachRate')}
              value={`${rate(totalBreached, totalClaims)}%`}
              tone={rate(totalBreached, totalClaims) > 0 ? 'warning' : 'good'}
            />
            <StatTile
              label={t('dashboards.sla.avgSettlement')}
              value={avgHours ?? '—'}
              unit={avgHours === null ? undefined : t('dashboards.sla.hours')}
              hint={
                avgHours === null ? t('dashboards.sla.noSettlements') : undefined
              }
            />
          </div>

          <section className="flex flex-col gap-5 rounded-2xl border border-border p-6">
            <h2 className="text-lg font-semibold tracking-tight">
              {t('dashboards.sla.breachByInsurer')}
            </h2>
            <BarList
              data={bars}
              max={100}
              emphasise={{
                keys: flagged,
                label: t('dashboards.sla.worstOffender'),
              }}
            />
          </section>

          {/* The table is the accessibility fallback and the precise reading. */}
          <details className="rounded-2xl border border-border p-5">
            <summary className="cursor-pointer text-sm font-medium">
              {t('dashboards.tableView')}
            </summary>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-foreground/55">
                    <th scope="col" className="p-3 text-start font-medium">
                      {t('dashboards.sla.table.insurer')}
                    </th>
                    <th scope="col" className="p-3 text-start font-medium">
                      {t('dashboards.sla.table.claims')}
                    </th>
                    <th scope="col" className="p-3 text-start font-medium">
                      {t('dashboards.sla.table.breached')}
                    </th>
                    <th scope="col" className="p-3 text-start font-medium">
                      {t('dashboards.sla.table.rate')}
                    </th>
                    <th scope="col" className="p-3 text-start font-medium">
                      {t('dashboards.sla.table.avgHours')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((row) => (
                    <tr
                      key={row.insurer_org_id}
                      className="border-b border-border/60"
                    >
                      <td className="p-3">{row.insurer_name}</td>
                      <td className="p-3 tabular-nums" dir="ltr">
                        {row.claims_count}
                      </td>
                      <td className="p-3 tabular-nums" dir="ltr">
                        {row.breached_count}
                      </td>
                      <td className="p-3 tabular-nums" dir="ltr">
                        {rate(row.breached_count, row.claims_count)}%
                      </td>
                      <td className="p-3 tabular-nums" dir="ltr">
                        {row.average_settlement_hours ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : null}
    </div>
  )
}
