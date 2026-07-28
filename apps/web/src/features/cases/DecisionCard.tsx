import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Scale } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { useCountdown, splitDuration } from '@/hooks/useCountdown'
import { ApiError } from '@/lib/api/errors'
import { formatDateTime } from '@/lib/format'
import { useLocale } from '@/i18n/useLocale'
import type { FaultDecision } from '@/lib/api/types'
import { caseQueryKey, submitObjection } from './api'

type Props = {
  caseNo: string
  decision: FaultDecision | null | undefined
  /** The signed-in user's party id, so "your share" is actually theirs. */
  myPartyId: number | null
}

function ObjectionForm({
  caseNo,
  secondsRemaining,
}: {
  caseNo: string
  secondsRemaining: number
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const remaining = useCountdown(secondsRemaining)
  const { hours, minutes } = splitDuration(remaining)

  const mutation = useMutation({
    mutationFn: submitObjection,
    onSuccess: async () => {
      setReason('')
      setError(null)
      await queryClient.invalidateQueries({ queryKey: caseQueryKey(caseNo) })
    },
    onError: (cause) => {
      if (cause instanceof ApiError && cause.isOffline) {
        setError(t('errors.network'))
        return
      }
      // The server re-checks the window; its message is the authoritative one.
      setError(
        cause instanceof ApiError && cause.message
          ? cause.message
          : t('errors.unexpected'),
      )
    },
  })

  if (remaining <= 0) {
    return <Alert tone="info">{t('cases.objection.windowClosed')}</Alert>
  }

  const submit = () => {
    if (reason.trim().length === 0) {
      setError(t('cases.objection.reasonRequired'))
      return
    }
    setError(null)
    mutation.mutate({ caseNo, reason: reason.trim() })
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-warning/30 bg-warning/8 p-5">
      <p className="text-sm font-medium">
        {t('cases.objection.windowOpen')}{' '}
        <span className="tabular-nums" dir="ltr">
          {hours > 0
            ? t('cases.objection.remainingHours', { hours, minutes })
            : t('cases.objection.remainingMinutes', { minutes })}
        </span>
      </p>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <Textarea
        label={t('cases.objection.reasonLabel')}
        placeholder={t('cases.objection.reasonPlaceholder')}
        maxLength={2000}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />

      <div>
        <Button onClick={submit} loading={mutation.isPending}>
          {mutation.isPending
            ? t('cases.objection.submitting')
            : t('cases.objection.submit')}
        </Button>
      </div>
    </div>
  )
}

export function DecisionCard({ caseNo, decision, myPartyId }: Props) {
  const { t } = useTranslation()
  const { locale } = useLocale()

  const partyLabel = useMemo(() => {
    return (partyId: number) =>
      partyId === myPartyId
        ? t('cases.decision.yourShare')
        : t('cases.decision.otherParty')
  }, [myPartyId, t])

  if (!decision) {
    return (
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight">
          {t('cases.decision.title')}
        </h2>
        <p className="text-sm text-foreground/60">{t('cases.decision.none')}</p>
      </section>
    )
  }

  const myObjection = decision.objections?.find(
    (objection) => objection.party_id === myPartyId,
  )

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold tracking-tight">
        {t('cases.decision.title')}
      </h2>

      <div className="flex flex-col gap-6 rounded-2xl border border-border p-5 sm:p-6">
        {/* The split, largest first — the number the reader came for. */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-foreground/55">
            {t('cases.decision.shares')}
          </h3>
          <ul className="flex flex-col gap-2">
            {(decision.allocations ?? []).map((allocation) => (
              <li
                key={allocation.party_id}
                className="flex items-center justify-between gap-4 rounded-xl bg-foreground/4 px-4 py-3"
              >
                <span className="text-sm font-medium">
                  {partyLabel(allocation.party_id)}
                </span>
                <span className="text-xl font-bold tabular-nums" dir="ltr">
                  {allocation.percentage}%
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* FR-F2: the rule in plain Arabic. A percentage with no stated reason
            is not something a person can meaningfully accept or dispute. */}
        {decision.rule_description_ar ? (
          <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/6 p-4">
            <Scale className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h3 className="text-sm font-medium text-foreground/55">
                {t('cases.decision.rule')}
              </h3>
              <p className="mt-1.5 text-sm leading-7">
                {decision.rule_description_ar}
              </p>
            </div>
          </div>
        ) : null}

        {decision.justification ? (
          <div>
            <h3 className="text-sm font-medium text-foreground/55">
              {t('cases.decision.justification')}
            </h3>
            <p className="mt-1.5 text-sm leading-7">{decision.justification}</p>
          </div>
        ) : null}

        {decision.was_overridden ? (
          <p className="text-sm text-warning">{t('cases.decision.overridden')}</p>
        ) : null}

        <p className="text-sm text-foreground/55">
          {t('cases.decision.decidedAt')}:{' '}
          {formatDateTime(decision.decided_at, locale)}
        </p>
      </div>

      <h2 className="mt-2 text-lg font-semibold tracking-tight">
        {t('cases.objection.title')}
      </h2>

      {myObjection ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
          <p className="text-sm font-medium">{t('cases.objection.already')}</p>
          <div>
            <h3 className="text-sm text-foreground/55">
              {t('cases.objection.yourReason')}
            </h3>
            <p className="mt-1 text-sm leading-7">{myObjection.reason}</p>
          </div>
          <p className="text-sm">
            {t(`cases.objection.status.${myObjection.status}`)}
          </p>
          {myObjection.resolution_note ? (
            <div>
              <h3 className="text-sm text-foreground/55">
                {t('cases.objection.resolution')}
              </h3>
              <p className="mt-1 text-sm leading-7">
                {myObjection.resolution_note}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <ObjectionForm
          caseNo={caseNo}
          secondsRemaining={decision.objection_seconds_remaining}
        />
      )}
    </section>
  )
}
