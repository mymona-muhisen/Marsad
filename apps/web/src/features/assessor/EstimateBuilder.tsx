import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, TriangleAlert, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { ApiError } from '@/lib/api/errors'
import { formatMoney } from '@/lib/format'
import { useLocale } from '@/i18n/useLocale'
import {
  assignedClaimQueryKey,
  fetchPartsPrices,
  partsPricesQueryKey,
  submitEstimate,
} from './api'
import {
  checkLines,
  deviationPercent,
  emptyLine,
  estimateTotal,
  isFlagged,
  type EstimateLine,
} from './estimate'

const TYPES = ['assessor', 'workshop', 'desk'] as const

export function EstimateBuilder({ claimId }: { claimId: number }) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const queryClient = useQueryClient()

  const [type, setType] = useState<(typeof TYPES)[number]>('assessor')
  const [lines, setLines] = useState<EstimateLine[]>([emptyLine()])
  const [error, setError] = useState<string | null>(null)

  const prices = useQuery({
    queryKey: partsPricesQueryKey,
    queryFn: fetchPartsPrices,
    staleTime: 10 * 60 * 1000,
  })

  const priceList = prices.data?.data ?? []

  const mutation = useMutation({
    mutationFn: () =>
      submitEstimate({
        claimId,
        type,
        items: lines.map((line) => ({
          description: line.description.trim(),
          part_code: line.partCode || null,
          qty: Number(line.qty),
          unit_price: Number(line.unitPrice),
          labor_hours: line.laborHours ? Number(line.laborHours) : null,
        })),
      }),
    onSuccess: async () => {
      setError(null)
      setLines([emptyLine()])
      await queryClient.invalidateQueries({
        queryKey: assignedClaimQueryKey(claimId),
      })
    },
    onError: (cause) =>
      setError(
        cause instanceof ApiError && cause.message
          ? cause.message
          : t('errors.unexpected'),
      ),
  })

  const patch = (index: number, changes: Partial<EstimateLine>) =>
    setLines((current) =>
      current.map((line, i) => (i === index ? { ...line, ...changes } : line)),
    )

  const submit = () => {
    const gate = checkLines(lines)

    if (!gate.ok) {
      setError(
        gate.reason === 'empty'
          ? t('assessor.form.atLeastOne')
          : t('assessor.form.lineIncomplete'),
      )
      return
    }

    setError(null)
    mutation.mutate()
  }

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold tracking-tight">
        {t('assessor.form.title')}
      </h2>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="estimate-type" className="text-sm font-medium">
          {t('assessor.form.type')}
        </label>
        <select
          id="estimate-type"
          value={type}
          onChange={(event) =>
            setType(event.target.value as (typeof TYPES)[number])
          }
          className="min-h-12 max-w-sm rounded-xl border border-border bg-background px-4 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        >
          {TYPES.map((value) => (
            <option key={value} value={value}>
              {t(`assessor.form.types.${value}`)}
            </option>
          ))}
        </select>
      </div>

      <ul className="flex flex-col gap-4">
        {lines.map((line, index) => {
          const reference = priceList.find(
            (price) => price.part_code === line.partCode,
          )
          const deviation = deviationPercent(line, priceList)
          const flagged = isFlagged(line, priceList)

          return (
            <li
              key={index}
              className="flex flex-col gap-4 rounded-2xl border border-border p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <TextField
                  label={t('assessor.form.description')}
                  placeholder={t('assessor.form.descriptionPlaceholder')}
                  value={line.description}
                  onChange={(event) =>
                    patch(index, { description: event.target.value })
                  }
                  maxLength={150}
                  className="flex-1"
                />
                {lines.length > 1 ? (
                  <button
                    type="button"
                    aria-label={t('assessor.form.removeLine')}
                    onClick={() =>
                      setLines((current) =>
                        current.filter((_, i) => i !== index),
                      )
                    }
                    className="mt-8 rounded-lg p-2 text-foreground/50 transition hover:bg-danger/10 hover:text-danger"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor={`part-${index}`}
                  className="text-sm font-medium"
                >
                  {t('assessor.form.part')}
                </label>
                <select
                  id={`part-${index}`}
                  value={line.partCode}
                  onChange={(event) =>
                    patch(index, { partCode: event.target.value })
                  }
                  className="min-h-12 rounded-xl border border-border bg-background px-4 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                >
                  <option value="">{t('assessor.form.partNone')}</option>
                  {priceList.map((price) => (
                    <option key={price.id} value={price.part_code}>
                      {price.name_ar}
                    </option>
                  ))}
                </select>

                {/* The reference the server measures against, shown before
                    submitting rather than discovered as a flag afterwards. */}
                {reference ? (
                  <p className="text-sm text-foreground/60">
                    {t('assessor.form.reference', {
                      price: formatMoney(reference.reference_price, locale),
                    })}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <TextField
                  label={t('assessor.form.qty')}
                  value={line.qty}
                  onChange={(event) => patch(index, { qty: event.target.value })}
                  inputMode="numeric"
                  dir="ltr"
                  className="text-start"
                />
                <TextField
                  label={t('assessor.form.unitPrice')}
                  value={line.unitPrice}
                  onChange={(event) =>
                    patch(index, { unitPrice: event.target.value })
                  }
                  inputMode="decimal"
                  dir="ltr"
                  className="text-start"
                />
                <TextField
                  label={t('assessor.form.laborHours')}
                  value={line.laborHours}
                  onChange={(event) =>
                    patch(index, { laborHours: event.target.value })
                  }
                  inputMode="decimal"
                  dir="ltr"
                  className="text-start"
                />
              </div>

              {flagged && deviation !== null ? (
                <p className="flex items-start gap-2 text-sm text-warning">
                  <TriangleAlert
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  {t('assessor.form.deviation', {
                    percent: Math.round(deviation),
                  })}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>

      <div>
        <Button
          variant="ghost"
          onClick={() => setLines((current) => [...current, emptyLine()])}
        >
          <Plus className="size-4" aria-hidden="true" />
          {t('assessor.form.addLine')}
        </Button>
      </div>

      <div className="flex flex-col gap-1 rounded-2xl bg-foreground/4 p-5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-foreground/60">
            {t('assessor.form.total')}
          </span>
          <span className="text-xl font-bold tabular-nums" dir="ltr">
            {formatMoney(estimateTotal(lines), locale)}
          </span>
        </div>
        {/* Doc 04 G10: the stored total is recomputed server-side. */}
        <p className="text-xs text-foreground/50">
          {t('assessor.form.totalNote')}
        </p>
      </div>

      <div>
        <Button size="lg" loading={mutation.isPending} onClick={submit}>
          {mutation.isPending
            ? t('assessor.form.submitting')
            : t('assessor.form.submit')}
        </Button>
      </div>
    </section>
  )
}
