import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { TextField } from '@/components/ui/TextField'
import { useAuth } from '@/features/auth/useAuth'
import { ApiError } from '@/lib/api/errors'
import { formatDate } from '@/lib/format'
import { useLocale } from '@/i18n/useLocale'
import type { InsurancePolicy } from '@/lib/api/types'
import {
  fetchInsurerPolicies,
  insurerPoliciesQueryKey,
  rejectPolicy,
  verifyPolicy,
} from './api'

type Filter = 'pending' | 'verified' | 'rejected'

const STATUS_TONES: Record<Filter, string> = {
  pending: 'border-warning/30 bg-warning/12 text-warning',
  verified: 'border-success/30 bg-success/12 text-success',
  rejected: 'border-danger/30 bg-danger/12 text-danger',
}

function PolicyRow({
  policy,
  canAct,
}: {
  policy: InsurancePolicy
  canAct: boolean
}) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const queryClient = useQueryClient()

  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: insurerPoliciesQueryKey })

  const onError = (cause: unknown) =>
    setError(
      cause instanceof ApiError && cause.message
        ? cause.message
        : t('errors.unexpected'),
    )

  const verify = useMutation({
    mutationFn: () => verifyPolicy(policy.id),
    onSuccess: async () => {
      setError(null)
      await invalidate()
    },
    onError,
  })

  const reject = useMutation({
    mutationFn: () => rejectPolicy({ policyId: policy.id, reason }),
    onSuccess: async () => {
      setError(null)
      setRejecting(false)
      setReason('')
      await invalidate()
    },
    onError,
  })

  const status = policy.verification_status

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-border p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-semibold tabular-nums" dir="ltr">
          {policy.policy_no}
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${STATUS_TONES[status]}`}
        >
          {t(`insurer.policies.statuses.${status}`)}
        </span>
      </div>

      <p className="text-sm text-foreground/60">
        {t('insurer.policies.period')}:{' '}
        <span dir="ltr" className="tabular-nums">
          {formatDate(policy.start_date, locale)} —{' '}
          {formatDate(policy.end_date, locale)}
        </span>
      </p>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {/* Only pending policies are actionable, and only by an agent. */}
      {canAct && status === 'pending' ? (
        rejecting ? (
          <div className="flex flex-col gap-3">
            <TextField
              label={t('insurer.policies.rejectReason')}
              placeholder={t('insurer.policies.rejectReasonPlaceholder')}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={255}
            />
            <div className="flex flex-wrap gap-3">
              <Button
                variant="danger"
                loading={reject.isPending}
                onClick={() => reject.mutate()}
              >
                {t('insurer.policies.confirmReject')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setRejecting(false)
                  setReason('')
                }}
              >
                {t('insurer.policies.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button loading={verify.isPending} onClick={() => verify.mutate()}>
              {t('insurer.policies.verify')}
            </Button>
            <Button variant="ghost" onClick={() => setRejecting(true)}>
              {t('insurer.policies.reject')}
            </Button>
          </div>
        )
      ) : null}
    </li>
  )
}

export function InsurerPoliciesPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [filter, setFilter] = useState<Filter>('pending')

  const canAct = user?.roles.includes('insurer_agent') ?? false

  const policies = useQuery({
    queryKey: [...insurerPoliciesQueryKey, filter],
    queryFn: () => fetchInsurerPolicies(filter),
  })

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('insurer.policies.title')}
        </h1>
        <p className="mt-3 text-sm leading-7 text-foreground/65">
          {t('insurer.policies.subtitle')}
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="policy-status"
          className="text-sm font-medium text-foreground"
        >
          {t('insurer.policies.filterStatus')}
        </label>
        <select
          id="policy-status"
          value={filter}
          onChange={(event) => setFilter(event.target.value as Filter)}
          className="min-h-11 max-w-xs rounded-xl border border-border bg-background px-4 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        >
          {(['pending', 'verified', 'rejected'] as Filter[]).map((value) => (
            <option key={value} value={value}>
              {t(`insurer.policies.statuses.${value}`)}
            </option>
          ))}
        </select>
      </div>

      {!canAct ? <Alert tone="info">{t('insurer.claim.readOnly')}</Alert> : null}

      {policies.isPending ? (
        <p className="flex items-center gap-3 text-sm text-foreground/60">
          <Spinner className="size-4 text-primary" />
          {t('common.loading')}
        </p>
      ) : null}

      {policies.isError ? (
        <Alert tone="danger">
          {t('errors.network')}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => void policies.refetch()}
          >
            {t('common.retry')}
          </button>
        </Alert>
      ) : null}

      {policies.data && policies.data.data.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-foreground/60">
          {t('insurer.policies.empty')}
        </p>
      ) : null}

      {policies.data && policies.data.data.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {policies.data.data.map((policy) => (
            <PolicyRow key={policy.id} policy={policy} canAct={canAct} />
          ))}
        </ul>
      ) : null}
    </div>
  )
}
