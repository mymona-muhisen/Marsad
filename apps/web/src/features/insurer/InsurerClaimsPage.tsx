import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { StatusChip } from '@/components/ui/StatusChip'
import { formatDateTime } from '@/lib/format'
import { useLocale } from '@/i18n/useLocale'
import { SlaIndicator } from '@/features/claims/SlaIndicator'
import type { ClaimStatus } from '@/lib/api/types'
import { fetchInsurerClaims, insurerClaimsQueryKey } from './api'

const STATUSES: ClaimStatus[] = [
  'opened',
  'info_requested',
  'assessing',
  'approved',
  'partially_approved',
  'rejected',
  'settled',
  'closed',
]

export function InsurerClaimsPage() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const [status, setStatus] = useState<ClaimStatus | ''>('')
  const [breachedOnly, setBreachedOnly] = useState(false)

  const claims = useQuery({
    queryKey: [...insurerClaimsQueryKey, status, breachedOnly],
    queryFn: () =>
      fetchInsurerClaims({ status, slaBreached: breachedOnly }),
  })

  // Server order is by creation; a working queue wants the deadline first.
  // Sorted on the server-computed figure, the same one SlaIndicator renders.
  const rows = [...(claims.data?.data ?? [])].sort(
    (a, b) => a.sla_seconds_remaining - b.sla_seconds_remaining,
  )

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('insurer.claims.title')}
        </h1>
        <p className="mt-3 text-sm leading-7 text-foreground/65">
          {t('insurer.claims.subtitle')}
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-5">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="claim-status"
            className="text-sm font-medium text-foreground"
          >
            {t('insurer.claims.filterStatus')}
          </label>
          <select
            id="claim-status"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as ClaimStatus | '')
            }
            className="min-h-11 rounded-xl border border-border bg-background px-4 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
          >
            <option value="">{t('insurer.claims.filterAll')}</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`claimStatus.${value}`)}
              </option>
            ))}
          </select>
        </div>

        <label className="flex min-h-11 items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={breachedOnly}
            onChange={(event) => setBreachedOnly(event.target.checked)}
            className="size-4 rounded border-border"
          />
          {t('insurer.claims.filterBreached')}
        </label>
      </div>

      {claims.isPending ? (
        <p className="flex items-center gap-3 text-sm text-foreground/60">
          <Spinner className="size-4 text-primary" />
          {t('common.loading')}
        </p>
      ) : null}

      {claims.isError ? (
        <Alert tone="danger">
          {t('errors.network')}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => void claims.refetch()}
          >
            {t('common.retry')}
          </button>
        </Alert>
      ) : null}

      {claims.data && rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-foreground/60">
          {t('insurer.claims.empty')}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {rows.map((claim) => (
            <li key={claim.id}>
              <Link
                to={`/app/insurer/claims/${claim.id}`}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-border p-5 transition hover:border-primary/40 hover:bg-primary/4"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold tabular-nums" dir="ltr">
                      {claim.case_no ?? `#${claim.id}`}
                    </span>
                    <StatusChip status={claim.status} kind="claim" />
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground/60">
                    <SlaIndicator claim={claim} />
                    <span>{formatDateTime(claim.sla_due_at, locale)}</span>
                  </span>
                </span>

                <span className="shrink-0 text-sm font-medium text-primary">
                  {t('insurer.claims.open')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
