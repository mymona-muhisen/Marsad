import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'

import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { StatusChip } from '@/components/ui/StatusChip'
import { ApiError } from '@/lib/api/errors'
import { formatDateTime, formatMoney } from '@/lib/format'
import { useLocale } from '@/i18n/useLocale'
import { claimQueryKey, fetchClaim } from './api'
import { ClaimTimeline } from './ClaimTimeline'
import { EstimateCard } from './EstimateCard'
import { SlaIndicator } from './SlaIndicator'


export function ClaimDetailPage() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const { claimId = '' } = useParams()
  const id = Number(claimId)

  const query = useQuery({
    queryKey: claimQueryKey(id),
    queryFn: () => fetchClaim(id),
    enabled: Number.isInteger(id) && id > 0,
    retry: false,
  })

  if (query.isPending) {
    return (
      <p className="flex items-center gap-3 text-sm text-foreground/60">
        <Spinner className="size-4 text-primary" />
        {t('common.loading')}
      </p>
    )
  }

  if (query.isError) {
    const notAllowed =
      query.error instanceof ApiError &&
      (query.error.isNotFound || query.error.isForbidden)

    return (
      <Alert tone="danger">
        {notAllowed ? t('claims.detail.notFound') : t('errors.network')}
      </Alert>
    )
  }

  const claim = query.data

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <Link to="/app/claims" className="text-sm text-primary hover:underline">
          {t('common.back')}
        </Link>

        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">
            {t('claims.detail.title')}
          </h1>
          <StatusChip status={claim.status} kind="claim" />
        </div>

        <SlaIndicator claim={claim} />

        {claim.case_no ? (
          <Link
            to={`/app/cases/${encodeURIComponent(claim.case_no)}`}
            className="text-sm text-primary hover:underline"
          >
            {t('claims.detail.viewCase')} · {claim.case_no}
          </Link>
        ) : null}
      </header>

      <ClaimTimeline claim={claim} />

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight">
          {t('claims.estimates.title')}
        </h2>

        {!claim.estimates || claim.estimates.length === 0 ? (
          <p className="text-sm text-foreground/60">
            {t('claims.estimates.empty')}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {claim.estimates.map((estimate) => (
              <EstimateCard key={estimate.id} estimate={estimate} />
            ))}
          </div>
        )}
      </section>

      {claim.settlement ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold tracking-tight">
            {t('claims.settlement.title')}
          </h2>

          <div className="flex flex-col gap-3 rounded-2xl border border-success/30 bg-success/8 p-5">
            <p className="font-medium">
              {t(`claims.settlement.modes.${claim.settlement.mode}`)}
            </p>
            <p className="text-2xl font-bold" dir="ltr">
              {formatMoney(claim.settlement.amount, locale)}
            </p>
            <p className="text-sm text-foreground/60">
              {t('claims.settlement.settledAt')}:{' '}
              {formatDateTime(claim.settlement.settled_at, locale)}
            </p>
          </div>
        </section>
      ) : null}
    </div>
  )
}
