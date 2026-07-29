import { useQuery } from '@tanstack/react-query'
import { TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'

import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { StatusChip } from '@/components/ui/StatusChip'
import { ApiError } from '@/lib/api/errors'
import { cn } from '@/lib/utils'
import { formatDateTime, formatMoney } from '@/lib/format'
import { useLocale } from '@/i18n/useLocale'
import type { Claim, DamageEstimate } from '@/lib/api/types'
import { claimQueryKey, fetchClaim } from './api'
import { SlaIndicator } from './SlaIndicator'

/**
 * The claim timeline, straight from `claim_events`.
 *
 * Unlike the case view, nothing here is derived: doc 04 §2.5 records every
 * mutation as a row precisely because "status alone loses history", so each
 * entry is an actual logged event with its own timestamp and — for insurer
 * decisions — the reason code the API makes mandatory.
 */
function Timeline({ claim }: { claim: Claim }) {
  const { t } = useTranslation()
  const { locale } = useLocale()

  const events = claim.events ?? []

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold tracking-tight">
        {t('claims.timeline.title')}
      </h2>

      {events.length === 0 ? (
        <p className="text-sm text-foreground/60">
          {t('claims.timeline.empty')}
        </p>
      ) : (
        <ol className="relative flex flex-col gap-5 border-s border-border ps-6">
          {events.map((event) => {
            const breach = event.action === 'sla_breached'

            return (
              <li key={event.id} className="relative">
                <span
                  className={cn(
                    'absolute -start-[1.72rem] top-1.5 size-3 rounded-full ring-4 ring-background',
                    breach ? 'bg-danger' : 'bg-primary',
                  )}
                  aria-hidden="true"
                />
                <p className={breach ? 'font-medium text-danger' : 'font-medium'}>
                  {t(`claims.timeline.actions.${event.action}`)}
                </p>

                <p className="mt-1 text-sm text-foreground/55">
                  {formatDateTime(event.created_at, locale)}
                </p>

                {/* Reason codes are mandatory on insurer decisions — showing
                    them is the whole point of that rule for the claimant. */}
                {event.reason_code ? (
                  <p className="mt-2 text-sm">
                    <span className="text-foreground/55">
                      {t('claims.timeline.reason')}:{' '}
                    </span>
                    {t(`claims.reasonCodes.${event.reason_code}`, {
                      defaultValue: event.reason_code,
                    })}
                  </p>
                ) : null}

                {event.note ? (
                  <p className="mt-1 text-sm leading-7 text-foreground/75">
                    {event.note}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

function EstimateCard({ estimate }: { estimate: DamageEstimate }) {
  const { t } = useTranslation()
  const { locale } = useLocale()

  return (
    <article className="overflow-hidden rounded-2xl border border-border">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <p className="font-semibold">
            {t(`claims.estimates.types.${estimate.type}`)}
          </p>
          <p className="mt-1 text-sm text-foreground/55">
            {t(`claims.estimates.statuses.${estimate.status}`)} ·{' '}
            {formatDateTime(estimate.created_at, locale)}
          </p>
        </div>
        <p className="text-lg font-bold" dir="ltr">
          {formatMoney(estimate.total, locale)}
        </p>
      </header>

      {estimate.items && estimate.items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-start text-foreground/55">
                <th scope="col" className="p-4 text-start font-medium">
                  {t('claims.estimates.description')}
                </th>
                <th scope="col" className="p-4 text-start font-medium">
                  {t('claims.estimates.qty')}
                </th>
                <th scope="col" className="p-4 text-start font-medium">
                  {t('claims.estimates.unitPrice')}
                </th>
                <th scope="col" className="p-4 text-start font-medium">
                  {t('claims.estimates.lineTotal')}
                </th>
              </tr>
            </thead>
            <tbody>
              {estimate.items.map((item) => (
                <tr key={item.id} className="border-b border-border/60">
                  <td className="p-4">
                    <span className="flex flex-wrap items-center gap-2">
                      {item.description}
                      {/* FR-CL3 — the claimant sees which line the insurer
                          will question, not just the total. */}
                      {item.deviation_flag ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/12 px-2 py-0.5 text-xs text-warning">
                          <TriangleAlert className="size-3" aria-hidden="true" />
                          {t('claims.estimates.deviation')}
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="p-4 tabular-nums" dir="ltr">
                    {item.qty}
                  </td>
                  <td className="p-4 tabular-nums" dir="ltr">
                    {formatMoney(item.unit_price, locale)}
                  </td>
                  <td className="p-4 tabular-nums" dir="ltr">
                    {formatMoney(item.line_total, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </article>
  )
}

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

      <Timeline claim={claim} />

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
