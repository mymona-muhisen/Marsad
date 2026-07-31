import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'

import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { StatusChip } from '@/components/ui/StatusChip'
import { EstimateCard } from '@/features/claims/EstimateCard'
import { SlaIndicator } from '@/features/claims/SlaIndicator'
import { ApiError } from '@/lib/api/errors'
import { EstimateBuilder } from './EstimateBuilder'
import { assignedClaimQueryKey, fetchAssignedClaim } from './api'

export function EstimateClaimPage() {
  const { t } = useTranslation()
  const { claimId = '' } = useParams()

  const id = Number(claimId)

  const query = useQuery({
    queryKey: assignedClaimQueryKey(id),
    queryFn: () => fetchAssignedClaim(id),
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
        {notAllowed ? t('assessor.detail.notFound') : t('errors.network')}
      </Alert>
    )
  }

  const claim = query.data

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <Link
          to="/app/estimates"
          className="text-sm text-primary hover:underline"
        >
          {t('assessor.detail.back')}
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
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight">
          {t('assessor.detail.existing')}
        </h2>

        {!claim.estimates || claim.estimates.length === 0 ? (
          <p className="text-sm text-foreground/60">
            {t('assessor.detail.noExisting')}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {claim.estimates.map((estimate) => (
              <EstimateCard key={estimate.id} estimate={estimate} />
            ))}
          </div>
        )}
      </section>

      <EstimateBuilder claimId={claim.id} />
    </div>
  )
}
