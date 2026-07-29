import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'

import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { StatusChip } from '@/components/ui/StatusChip'
import { ClaimTimeline } from '@/features/claims/ClaimTimeline'
import { EstimateCard } from '@/features/claims/EstimateCard'
import { SlaIndicator } from '@/features/claims/SlaIndicator'
import { useAuth } from '@/features/auth/useAuth'
import { ApiError } from '@/lib/api/errors'
import { formatDateTime, formatMoney } from '@/lib/format'
import { useLocale } from '@/i18n/useLocale'
import { DecisionPanel } from './DecisionPanel'
import { SettlementForm } from './SettlementForm'
import { fetchInsurerClaim, insurerClaimQueryKey } from './api'

/**
 * The insurer's view of one claim.
 *
 * Timeline, estimates and SLA are the same components the claimant sees — one
 * implementation each, so the two sides can never disagree about a deadline or
 * a deviation flag. What differs is what may be done: the decision panel and
 * settlement form.
 */
export function InsurerClaimDetailPage() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const { claimId = '' } = useParams()
  const { user } = useAuth()

  const id = Number(claimId)

  const query = useQuery({
    queryKey: insurerClaimQueryKey(id),
    queryFn: () => fetchInsurerClaim(id),
    enabled: Number.isInteger(id) && id > 0,
    retry: false,
  })

  // Mirrors the route split: the admin reads, the agent acts. Showing controls
  // that would answer 403 is worse than not showing them.
  const canAct = user?.roles.includes('insurer_agent') ?? false

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
        {notAllowed ? t('insurer.claim.notFound') : t('errors.network')}
      </Alert>
    )
  }

  const claim = query.data

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <Link
          to="/app/insurer/claims"
          className="text-sm text-primary hover:underline"
        >
          {t('insurer.claim.back')}
        </Link>

        <div className="flex flex-wrap items-center gap-4">
          <h1
            className="text-2xl font-bold tabular-nums tracking-tight"
            dir="ltr"
          >
            {claim.case_no ?? `#${claim.id}`}
          </h1>
          <StatusChip status={claim.status} kind="claim" />
        </div>

        <SlaIndicator claim={claim} />

        <p className="text-sm text-foreground/60">
          {t('insurer.claims.sla')}: {formatDateTime(claim.sla_due_at, locale)}
        </p>
      </header>

      <ClaimTimeline claim={claim} />

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight">
          {t('insurer.claim.estimates')}
        </h2>

        {!claim.estimates || claim.estimates.length === 0 ? (
          <p className="text-sm text-foreground/60">
            {t('insurer.claim.noEstimates')}
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
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight">
            {t('insurer.claim.settlement')}
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-success/30 bg-success/8 p-5">
            <span className="text-sm font-medium">
              {t(`insurer.settle.modes.${claim.settlement.mode}`)}
            </span>
            <span className="text-lg font-bold tabular-nums" dir="ltr">
              {formatMoney(claim.settlement.amount, locale)}
            </span>
          </div>
        </section>
      ) : null}

      {canAct ? (
        <>
          <DecisionPanel claimId={claim.id} />
          {/* A settled claim has nothing left to settle. */}
          {claim.settlement ? null : <SettlementForm claimId={claim.id} />}
        </>
      ) : (
        <Alert tone="info">{t('insurer.claim.readOnly')}</Alert>
      )}
    </div>
  )
}
