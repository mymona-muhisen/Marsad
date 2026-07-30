import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { StatTile } from '@/components/charts/StatTile'
import { TrendArea } from '@/components/charts/TrendArea'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { fetchFraudSummary, fraudSummaryQueryKey } from './api'

const DAY_OPTIONS = [7, 30, 90] as const

export function FraudFlagsPage() {
  const { t } = useTranslation()
  const [days, setDays] = useState<number>(30)

  const summary = useQuery({
    queryKey: [...fraudSummaryQueryKey, days],
    queryFn: () => fetchFraudSummary(days),
  })

  const data = summary.data?.data
  const inPeriod = (data?.daily_counts ?? []).reduce(
    (sum, point) => sum + point.count,
    0,
  )

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('dashboards.fraud.title')}
        </h1>
        <p className="mt-3 text-sm leading-7 text-foreground/65">
          {t('dashboards.fraud.subtitle')}
        </p>
      </header>

      {/* Filters in one row above the charts. */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="fraud-days"
          className="text-sm font-medium text-foreground"
        >
          {t('dashboards.filters.days')}
        </label>
        <select
          id="fraud-days"
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
          className="min-h-11 max-w-xs rounded-xl border border-border bg-background px-4 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        >
          {DAY_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {t(`dashboards.filters.dayOptions.${value}`)}
            </option>
          ))}
        </select>
      </div>

      {summary.isPending ? (
        <p className="flex items-center gap-3 text-sm text-foreground/60">
          <Spinner className="size-4 text-primary" />
          {t('common.loading')}
        </p>
      ) : null}

      {summary.isError ? (
        <Alert tone="danger">
          {t('errors.network')}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => void summary.refetch()}
          >
            {t('common.retry')}
          </button>
        </Alert>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatTile
              label={t('dashboards.fraud.total')}
              value={data.total}
              tone={data.total > 0 ? 'warning' : 'good'}
            />
            <StatTile
              label={t('dashboards.fraud.inPeriod')}
              value={inPeriod}
              tone={inPeriod > 0 ? 'warning' : 'good'}
            />
          </div>

          <section className="flex flex-col gap-4 rounded-2xl border border-border p-6">
            <h2 className="text-lg font-semibold tracking-tight">
              {t('dashboards.fraud.trend')}
            </h2>
            <TrendArea
              points={data.daily_counts}
              label={t('dashboards.fraud.trend')}
              emptyLabel={t('dashboards.fraud.trendEmpty')}
            />
          </section>

          {/* A table, not a chart: there is one reason code in the system
              today, and a one-bar chart invites a comparison with nothing.
              It scales correctly if more reasons are added. */}
          <section className="flex flex-col gap-4 rounded-2xl border border-border p-6">
            <h2 className="text-lg font-semibold tracking-tight">
              {t('dashboards.fraud.byReason')}
            </h2>

            {data.by_reason.length === 0 ? (
              <p className="text-sm text-foreground/60">
                {t('dashboards.fraud.reasonsEmpty')}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-foreground/55">
                      <th scope="col" className="p-3 text-start font-medium">
                        {t('dashboards.fraud.reasonTable.reason')}
                      </th>
                      <th scope="col" className="p-3 text-start font-medium">
                        {t('dashboards.fraud.reasonTable.count')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_reason.map((row) => (
                      <tr key={row.reason} className="border-b border-border/60">
                        <td className="p-3">
                          {/* An unmapped reason shows its raw code rather than
                              a missing-key placeholder. */}
                          {t(`dashboards.fraud.reasons.${row.reason}`, {
                            defaultValue: row.reason,
                          })}
                        </td>
                        <td className="p-3 tabular-nums" dir="ltr">
                          {row.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="text-xs leading-6 text-foreground/50">
            {t('dashboards.aggregateOnly')}
          </p>
        </>
      ) : null}
    </div>
  )
}
