import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'

import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { StatusChip } from '@/components/ui/StatusChip'
import { ApiError } from '@/lib/api/errors'
import { formatDateTime } from '@/lib/format'
import { useAuth } from '@/features/auth/useAuth'
import { useLocale } from '@/i18n/useLocale'
import type { AccidentCase } from '@/lib/api/types'
import { caseQueryKey, fetchCase } from './api'
import { DecisionCard } from './DecisionCard'
import { EvidenceGallery } from './EvidenceGallery'

/**
 * Milestones derived from the timestamps the API already carries.
 *
 * There is no `case_events` table — only claims have an event log — so the
 * timeline is reconstructed from real recorded times rather than invented.
 * Every entry here is a fact with a source; nothing is inferred from the
 * current status alone.
 */
function useTimeline(accidentCase: AccidentCase) {
  const { t } = useTranslation()

  const entries: { key: string; label: string; at: string | null }[] = [
    {
      key: 'reported',
      label: t('cases.timeline.reported'),
      at: accidentCase.created_at,
    },
  ]

  const counterparty = accidentCase.parties?.find(
    (party) => party.role === 'counterparty',
  )

  if (counterparty?.joined_at) {
    entries.push({
      key: 'counterpartyJoined',
      label: t('cases.timeline.counterpartyJoined'),
      at: counterparty.joined_at,
    })
  } else if (accidentCase.status === 'awaiting_counterparty') {
    entries.push({
      key: 'counterpartyPending',
      label: t('cases.timeline.counterpartyPending'),
      at: null,
    })
  }

  if (accidentCase.fault_decision) {
    entries.push({
      key: 'decision',
      label: t('cases.timeline.decision'),
      at: accidentCase.fault_decision.decided_at,
    })

    for (const objection of accidentCase.fault_decision.objections ?? []) {
      entries.push({
        key: `objection-${objection.id}`,
        label: t('cases.timeline.objection'),
        at: null,
      })
      if (objection.resolved_at) {
        entries.push({
          key: `objection-resolved-${objection.id}`,
          label: t('cases.timeline.objectionResolved'),
          at: objection.resolved_at,
        })
      }
    }
  }

  for (const report of accidentCase.reports ?? []) {
    entries.push({
      key: `report-${report.report_no}`,
      label: t('cases.timeline.report'),
      at: report.issued_at,
    })
  }

  for (const claim of accidentCase.claims ?? []) {
    entries.push({
      key: `claim-${claim.id}`,
      label: t('cases.timeline.claim'),
      at: claim.opened_at,
    })
  }

  return entries
}

function Timeline({ accidentCase }: { accidentCase: AccidentCase }) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const entries = useTimeline(accidentCase)

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold tracking-tight">
        {t('cases.timeline.title')}
      </h2>

      <ol className="relative flex flex-col gap-5 border-s border-border ps-6">
        {entries.map((entry) => (
          <li key={entry.key} className="relative">
            <span
              className="absolute -start-[1.72rem] top-1.5 size-3 rounded-full bg-primary ring-4 ring-background"
              aria-hidden="true"
            />
            <p className="font-medium">{entry.label}</p>
            {entry.at ? (
              <p className="mt-1 text-sm text-foreground/55">
                {formatDateTime(entry.at, locale)}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  )
}

function Facts({ accidentCase }: { accidentCase: AccidentCase }) {
  const { t } = useTranslation()
  const { locale } = useLocale()

  const rows = [
    {
      label: t('cases.detail.occurredAt'),
      value: formatDateTime(accidentCase.occurred_at, locale),
    },
    {
      label: t('cases.detail.location'),
      value:
        [accidentCase.region, accidentCase.location_description]
          .filter(Boolean)
          .join(' — ') ||
        `${accidentCase.lat}, ${accidentCase.lng}`,
    },
    {
      label: t('cases.detail.injuries'),
      value: accidentCase.injury_flag
        ? t('report.review.yes')
        : t('report.review.no'),
    },
  ]

  if (accidentCase.track) {
    rows.splice(1, 0, {
      label: t('cases.detail.track'),
      value: t(`caseTrack.${accidentCase.track}`),
    })
  }

  return (
    <dl className="grid gap-px overflow-hidden rounded-2xl border border-border sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="bg-background p-5">
          <dt className="text-sm text-foreground/55">{row.label}</dt>
          <dd className="mt-1 font-medium wrap-break-word">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function CaseDetailPage() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const { caseNo = '' } = useParams()
  const { user } = useAuth()

  const query = useQuery({
    queryKey: caseQueryKey(caseNo),
    queryFn: () => fetchCase(caseNo),
    enabled: caseNo.length > 0,
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
        {notAllowed ? t('cases.detail.notFound') : t('errors.network')}
      </Alert>
    )
  }

  const accidentCase = query.data
  const myParty =
    accidentCase.parties?.find((party) => party.user_id === user?.id) ?? null

  // Evidence is nested per party; the gallery shows the whole case's file.
  const evidence = (accidentCase.parties ?? []).flatMap(
    (party) => party.evidence ?? [],
  )

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <Link to="/app/cases" className="text-sm text-primary hover:underline">
          {t('common.back')}
        </Link>

        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-bold tabular-nums tracking-tight" dir="ltr">
            {accidentCase.case_no}
          </h1>
          <StatusChip status={accidentCase.status} />
        </div>
      </header>

      <Facts accidentCase={accidentCase} />

      <Timeline accidentCase={accidentCase} />

      <DecisionCard
        caseNo={accidentCase.case_no}
        decision={accidentCase.fault_decision}
        myPartyId={myParty?.id ?? null}
      />

      <EvidenceGallery items={evidence} />

      {accidentCase.reports && accidentCase.reports.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold tracking-tight">
            {t('cases.report.title')}
          </h2>
          <ul className="flex flex-col gap-3">
            {accidentCase.reports.map((report) => (
              <li
                key={report.report_no}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-5"
              >
                <div>
                  <p className="font-semibold tabular-nums" dir="ltr">
                    {report.report_no}
                  </p>
                  <p className="mt-1 text-sm text-foreground/55">
                    {t('cases.report.issuedAt')}{' '}
                    {formatDateTime(report.issued_at, locale)}
                  </p>
                </div>
                <Link
                  to={`/verify/${encodeURIComponent(report.qr_token)}`}
                  className="text-sm text-primary hover:underline"
                >
                  {t('cases.report.verify')}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {accidentCase.claims && accidentCase.claims.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold tracking-tight">
            {t('cases.claim.title')}
          </h2>
          <ul className="flex flex-col gap-3">
            {accidentCase.claims.map((claim) => (
              <li
                key={claim.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-5"
              >
                <StatusChip status={claim.status} kind="claim" />
                <p className="text-sm text-foreground/55">
                  {t('cases.claim.sla')}:{' '}
                  {formatDateTime(claim.sla_due_at, locale)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
