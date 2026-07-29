import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { ApiError } from '@/lib/api/errors'
import type { ClaimDecisionOutcome, ClaimReasonCode } from '@/lib/api/types'
import {
  decideClaim,
  insurerClaimQueryKey,
  insurerClaimsQueryKey,
} from './api'

const OUTCOMES: ClaimDecisionOutcome[] = [
  'approve',
  'partial',
  'reject',
  'request_info',
]

const REASONS: ClaimReasonCode[] = [
  'fully_covered',
  'coverage_limit',
  'deviation_adjusted',
  'policy_lapsed',
  'damage_not_covered',
  'fraud_suspected',
  'missing_documents',
  'need_clarification',
]

/**
 * FR-CL2: reason codes are mandatory. The select has no pre-selected value on
 * purpose — defaulting it would let an agent record a reason they never chose,
 * which is the whole point of requiring one.
 */
export function DecisionPanel({ claimId }: { claimId: number }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [outcome, setOutcome] = useState<ClaimDecisionOutcome>('approve')
  const [reasonCode, setReasonCode] = useState<ClaimReasonCode | ''>('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: decideClaim,
    onSuccess: async () => {
      setReasonCode('')
      setNote('')
      setError(null)
      await queryClient.invalidateQueries({
        queryKey: insurerClaimQueryKey(claimId),
      })
      await queryClient.invalidateQueries({ queryKey: insurerClaimsQueryKey })
    },
    onError: (cause) => {
      setError(
        cause instanceof ApiError && cause.message
          ? cause.message
          : t('errors.unexpected'),
      )
    },
  })

  const submit = () => {
    if (!reasonCode) {
      setError(t('insurer.decide.reasonRequired'))
      return
    }
    setError(null)
    mutation.mutate({ claimId, outcome, reasonCode, note })
  }

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold tracking-tight">
        {t('insurer.decide.title')}
      </h2>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="flex flex-col gap-2">
        <label
          htmlFor="outcome"
          className="text-sm font-medium text-foreground"
        >
          {t('insurer.decide.outcome')}
        </label>
        <select
          id="outcome"
          value={outcome}
          onChange={(event) =>
            setOutcome(event.target.value as ClaimDecisionOutcome)
          }
          className="min-h-12 rounded-xl border border-border bg-background px-4 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        >
          {OUTCOMES.map((value) => (
            <option key={value} value={value}>
              {t(`insurer.decide.outcomes.${value}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="reason-code"
          className="text-sm font-medium text-foreground"
        >
          {t('insurer.decide.reasonCode')}
        </label>
        <select
          id="reason-code"
          value={reasonCode}
          onChange={(event) =>
            setReasonCode(event.target.value as ClaimReasonCode | '')
          }
          className="min-h-12 rounded-xl border border-border bg-background px-4 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        >
          <option value="">{t('insurer.decide.reasonPlaceholder')}</option>
          {REASONS.map((value) => (
            <option key={value} value={value}>
              {t(`insurer.decide.reasons.${value}`)}
            </option>
          ))}
        </select>
      </div>

      <Textarea
        label={t('insurer.decide.note')}
        placeholder={t('insurer.decide.notePlaceholder')}
        maxLength={2000}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />

      <Alert tone="info">{t('insurer.decide.mandatoryNotice')}</Alert>

      <div>
        <Button
          onClick={submit}
          disabled={!reasonCode}
          loading={mutation.isPending}
        >
          {mutation.isPending
            ? t('insurer.decide.submitting')
            : t('insurer.decide.submit')}
        </Button>
      </div>
    </section>
  )
}
