import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { TextField } from '@/components/ui/TextField'
import { Textarea } from '@/components/ui/Textarea'
import {
  fetchLiabilityRules,
  liabilityRulesQueryKey,
} from '@/features/adjudication/api'
import { ApiError } from '@/lib/api/errors'
import { formatDate } from '@/lib/format'
import { useLocale } from '@/i18n/useLocale'
import { publishLiabilityRule } from './api'

export function MatrixPanel() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const queryClient = useQueryClient()

  const [scenarioCode, setScenarioCode] = useState('')
  const [description, setDescription] = useState('')
  const [splitA, setSplitA] = useState('100')
  const [splitB, setSplitB] = useState('0')
  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const rules = useQuery({
    queryKey: liabilityRulesQueryKey,
    queryFn: fetchLiabilityRules,
  })

  const mutation = useMutation({
    mutationFn: () =>
      publishLiabilityRule({
        scenarioCode: scenarioCode.trim(),
        descriptionAr: description.trim(),
        faultSplitA: Number(splitA),
        faultSplitB: Number(splitB),
        effectiveFrom,
      }),
    onSuccess: async () => {
      setError(null)
      setDone(true)
      setScenarioCode('')
      setDescription('')
      await queryClient.invalidateQueries({ queryKey: liabilityRulesQueryKey })
    },
    onError: (cause) => {
      setDone(false)
      setError(
        cause instanceof ApiError && cause.message
          ? cause.message
          : t('errors.unexpected'),
      )
    },
  })

  const total = Number(splitA) + Number(splitB)

  const submit = () => {
    // The server asserts this too; catching it here saves a round trip on the
    // single most common mistake when writing a split.
    if (total !== 100) {
      setError(t('admin.matrix.mustTotal'))
      return
    }
    setError(null)
    mutation.mutate()
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm leading-7 text-foreground/65">
        {t('admin.matrix.subtitle')}
      </p>

      <section className="flex flex-col gap-5 rounded-2xl border border-border p-5 sm:p-6">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {done ? <Alert tone="success">{t('admin.matrix.success')}</Alert> : null}

        <TextField
          label={t('admin.matrix.scenario')}
          placeholder={t('admin.matrix.scenarioPlaceholder')}
          value={scenarioCode}
          onChange={(event) => setScenarioCode(event.target.value)}
          dir="ltr"
          className="text-start"
          maxLength={30}
        />

        <Textarea
          label={t('admin.matrix.description')}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={500}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label={t('admin.matrix.splitA')}
            value={splitA}
            onChange={(event) => setSplitA(event.target.value)}
            inputMode="numeric"
            dir="ltr"
            className="text-start"
          />
          <TextField
            label={t('admin.matrix.splitB')}
            value={splitB}
            onChange={(event) => setSplitB(event.target.value)}
            inputMode="numeric"
            dir="ltr"
            className="text-start"
          />
          <TextField
            label={t('admin.matrix.effectiveFrom')}
            type="date"
            value={effectiveFrom}
            onChange={(event) => setEffectiveFrom(event.target.value)}
            dir="ltr"
            className="text-start"
          />
        </div>

        {total !== 100 ? (
          <p className="text-sm text-danger">{t('admin.matrix.mustTotal')}</p>
        ) : null}

        <div>
          <Button
            loading={mutation.isPending}
            disabled={total !== 100}
            onClick={submit}
          >
            {mutation.isPending
              ? t('admin.matrix.publishing')
              : t('admin.matrix.publish')}
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="font-semibold">{t('admin.matrix.currentTitle')}</h3>

        {rules.isPending ? (
          <p className="flex items-center gap-3 text-sm text-foreground/60">
            <Spinner className="size-4 text-primary" />
            {t('common.loading')}
          </p>
        ) : null}

        {rules.data ? (
          <ul className="flex flex-col gap-3">
            {rules.data.data.map((rule) => (
              <li
                key={rule.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border p-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold tabular-nums" dir="ltr">
                    {rule.scenario_code} · v{rule.version}
                  </p>
                  <p className="mt-1 text-sm leading-7 text-foreground/70">
                    {rule.description_ar}
                  </p>
                  <p className="mt-1 text-xs text-foreground/50">
                    {formatDate(rule.effective_from, locale)}
                  </p>
                </div>
                <span className="text-lg font-bold tabular-nums" dir="ltr">
                  {rule.fault_split_a}% / {rule.fault_split_b}%
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  )
}
