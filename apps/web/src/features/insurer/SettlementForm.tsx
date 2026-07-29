import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { ApiError } from '@/lib/api/errors'
import { useLocale } from '@/i18n/useLocale'
import type { SettlementMode } from '@/lib/api/types'
import {
  fetchWorkshops,
  insurerClaimQueryKey,
  insurerClaimsQueryKey,
  recordSettlement,
  workshopsQueryKey,
} from './api'

const MODES: SettlementMode[] = ['repair_order', 'cash']

export function SettlementForm({ claimId }: { claimId: number }) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const queryClient = useQueryClient()

  const [mode, setMode] = useState<SettlementMode>('repair_order')
  const [amount, setAmount] = useState('')
  const [workshopId, setWorkshopId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const workshops = useQuery({
    queryKey: workshopsQueryKey,
    queryFn: fetchWorkshops,
    // Only fetched when it can actually be used.
    enabled: mode === 'repair_order',
    staleTime: 10 * 60 * 1000,
  })

  const mutation = useMutation({
    mutationFn: recordSettlement,
    onSuccess: async () => {
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
    const parsed = Number(amount)

    if (!amount.trim() || Number.isNaN(parsed) || parsed < 0) {
      setError(t('insurer.settle.amountRequired'))
      return
    }

    // Mirrors RecordSettlementRequest's required_if:mode,repair_order.
    if (mode === 'repair_order' && !workshopId) {
      setError(t('insurer.settle.workshopRequired'))
      return
    }

    setError(null)
    mutation.mutate({
      claimId,
      mode,
      amount: parsed,
      workshopOrgId: workshopId ? Number(workshopId) : null,
    })
  }

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold tracking-tight">
        {t('insurer.settle.title')}
      </h2>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="flex flex-col gap-2">
        <label
          htmlFor="settlement-mode"
          className="text-sm font-medium text-foreground"
        >
          {t('insurer.settle.mode')}
        </label>
        <select
          id="settlement-mode"
          value={mode}
          onChange={(event) => {
            setMode(event.target.value as SettlementMode)
            setError(null)
          }}
          className="min-h-12 rounded-xl border border-border bg-background px-4 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        >
          {MODES.map((value) => (
            <option key={value} value={value}>
              {t(`insurer.settle.modes.${value}`)}
            </option>
          ))}
        </select>
      </div>

      <TextField
        label={t('insurer.settle.amount')}
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        inputMode="decimal"
        dir="ltr"
        className="text-start"
      />

      {mode === 'repair_order' ? (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="workshop"
            className="text-sm font-medium text-foreground"
          >
            {t('insurer.settle.workshop')}
          </label>
          <select
            id="workshop"
            value={workshopId}
            onChange={(event) => setWorkshopId(event.target.value)}
            className="min-h-12 rounded-xl border border-border bg-background px-4 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
          >
            <option value="">{t('insurer.settle.workshopPlaceholder')}</option>
            {(workshops.data?.data ?? []).map((workshop) => (
              <option key={workshop.id} value={workshop.id}>
                {locale === 'en' ? workshop.name_en : workshop.name_ar}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <Button onClick={submit} loading={mutation.isPending}>
          {mutation.isPending
            ? t('insurer.settle.submitting')
            : t('insurer.settle.submit')}
        </Button>
      </div>
    </section>
  )
}
