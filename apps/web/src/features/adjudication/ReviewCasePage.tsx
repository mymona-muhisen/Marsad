import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { StatusChip } from '@/components/ui/StatusChip'
import { Textarea } from '@/components/ui/Textarea'
import { EvidenceGallery } from '@/features/cases/EvidenceGallery'
import { caseQueryKey, fetchCase } from '@/features/cases/api'
import { ApiError } from '@/lib/api/errors'
import { formatDateTime } from '@/lib/format'
import { useLocale } from '@/i18n/useLocale'
import type { CaseParty } from '@/lib/api/types'
import {
  fetchLiabilityRules,
  liabilityRulesQueryKey,
  queueQueryKey,
  submitDecision,
} from './api'
import {
  checkDecision,
  isOverride,
  proposalFor,
  totalPercentage,
  type Allocation,
} from './decision'

function StatementColumn({
  party,
  label,
}: {
  party: CaseParty
  label: string
}) {
  const { t } = useTranslation()
  const statement = (party.statement_text ?? '').trim()

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
      <h3 className="font-semibold">{label}</h3>
      {statement.length > 0 ? (
        <p className="text-sm leading-8 whitespace-pre-wrap">{statement}</p>
      ) : (
        <p className="text-sm text-foreground/55">
          {t('adjudication.review.noStatement')}
        </p>
      )}
    </div>
  )
}

export function ReviewCasePage() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const { caseNo = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [scenarioCode, setScenarioCode] = useState('')
  const [allocations, setAllocations] = useState<Allocation[] | null>(null)
  const [justification, setJustification] = useState('')
  const [banner, setBanner] = useState<string | null>(null)

  const caseQuery = useQuery({
    queryKey: caseQueryKey(caseNo),
    queryFn: () => fetchCase(caseNo),
    enabled: caseNo.length > 0,
    retry: false,
  })

  const rulesQuery = useQuery({
    queryKey: liabilityRulesQueryKey,
    queryFn: fetchLiabilityRules,
    staleTime: 10 * 60 * 1000,
  })

  const parties = useMemo(
    () => caseQuery.data?.parties ?? [],
    [caseQuery.data],
  )

  // Start every party at zero so the form is complete before it is touched.
  const currentAllocations = useMemo<Allocation[]>(
    () =>
      allocations ??
      parties.map((party) => ({ party_id: party.id, percentage: 0 })),
    [allocations, parties],
  )

  const selectedRule =
    rulesQuery.data?.data.find((rule) => rule.scenario_code === scenarioCode) ??
    null

  const total = totalPercentage(currentAllocations)
  const override = isOverride(selectedRule, currentAllocations)
  const gate = checkDecision(selectedRule, currentAllocations, justification)

  const mutation = useMutation({
    mutationFn: submitDecision,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queueQueryKey })
      await queryClient.invalidateQueries({ queryKey: caseQueryKey(caseNo) })
      void navigate('/app/adjudication/queue')
    },
    onError: (error) => {
      setBanner(
        error instanceof ApiError && error.message
          ? error.message
          : t('errors.unexpected'),
      )
    },
  })

  if (caseQuery.isPending) {
    return (
      <p className="flex items-center gap-3 text-sm text-foreground/60">
        <Spinner className="size-4 text-primary" />
        {t('common.loading')}
      </p>
    )
  }

  if (caseQuery.isError) {
    const notAllowed =
      caseQuery.error instanceof ApiError &&
      (caseQuery.error.isNotFound || caseQuery.error.isForbidden)

    return (
      <Alert tone="danger">
        {notAllowed
          ? t('adjudication.review.notFound')
          : t('errors.network')}
      </Alert>
    )
  }

  const accidentCase = caseQuery.data
  const evidence = parties.flatMap((party) => party.evidence ?? [])

  const partyLabel = (party: CaseParty) =>
    party.role === 'counterparty'
      ? t('adjudication.review.counterparty')
      : t('adjudication.review.reporter')

  const setPercentage = (partyId: number, raw: string) => {
    const value = raw === '' ? 0 : Number(raw)
    if (Number.isNaN(value)) return

    setAllocations(
      currentAllocations.map((item) =>
        item.party_id === partyId
          ? { ...item, percentage: Math.min(100, Math.max(0, value)) }
          : item,
      ),
    )
  }

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <Link
          to="/app/adjudication/queue"
          className="text-sm text-primary hover:underline"
        >
          {t('adjudication.review.backToQueue')}
        </Link>

        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-bold tabular-nums tracking-tight" dir="ltr">
            {accidentCase.case_no}
          </h1>
          <StatusChip status={accidentCase.status} />
        </div>

        <p className="text-sm text-foreground/60">
          {formatDateTime(accidentCase.occurred_at, locale)}
          {accidentCase.region ? ` · ${accidentCase.region}` : ''}
          {accidentCase.location_description
            ? ` · ${accidentCase.location_description}`
            : ''}
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight">
          {t('adjudication.review.statements')}
        </h2>
        {/* Honest about what the tool does: it lays the accounts out, it does
            not analyse them. No fabricated "contradiction detection". */}
        <p className="text-sm text-foreground/60">
          {t('adjudication.review.statementsHint')}
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
          {parties.map((party) => (
            <StatementColumn
              key={party.id}
              party={party}
              label={partyLabel(party)}
            />
          ))}
        </div>
      </section>

      <EvidenceGallery items={evidence} />

      <section className="flex flex-col gap-5">
        <h2 className="text-lg font-semibold tracking-tight">
          {t('adjudication.decide.title')}
        </h2>

        {banner ? <Alert tone="danger">{banner}</Alert> : null}

        <div className="flex flex-col gap-2">
          <label
            htmlFor="scenario"
            className="text-sm font-medium text-foreground"
          >
            {t('adjudication.decide.scenario')}
          </label>
          <select
            id="scenario"
            value={scenarioCode}
            onChange={(event) => setScenarioCode(event.target.value)}
            className="min-h-12 rounded-xl border border-border bg-background px-4 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
          >
            <option value="">{t('adjudication.decide.manual')}</option>
            {(rulesQuery.data?.data ?? []).map((rule) => (
              <option key={rule.id} value={rule.scenario_code}>
                {rule.scenario_code} — {rule.description_ar}
              </option>
            ))}
          </select>
        </div>

        {selectedRule ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary/6 p-5">
            <h3 className="font-semibold">
              {t('adjudication.decide.proposal')}
            </h3>
            <p className="text-sm leading-7">{selectedRule.description_ar}</p>
            <p className="text-sm text-foreground/60">
              {t('adjudication.decide.proposalHint')}
            </p>
            <p className="text-lg font-bold tabular-nums" dir="ltr">
              {selectedRule.fault_split_a}% / {selectedRule.fault_split_b}%
            </p>
            <div>
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setAllocations(
                    proposalFor(
                      selectedRule,
                      parties.map((party) => party.id),
                    ),
                  )
                }
              >
                {t('adjudication.decide.applyProposal')}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-foreground/70">
            {t('adjudication.decide.allocations')}
          </h3>

          {parties.map((party) => {
            const allocation = currentAllocations.find(
              (item) => item.party_id === party.id,
            )

            return (
              <div
                key={party.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"
              >
                <label
                  htmlFor={`allocation-${party.id}`}
                  className="text-sm font-medium"
                >
                  {partyLabel(party)}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id={`allocation-${party.id}`}
                    type="number"
                    min={0}
                    max={100}
                    inputMode="numeric"
                    dir="ltr"
                    value={allocation?.percentage ?? 0}
                    onChange={(event) =>
                      setPercentage(party.id, event.target.value)
                    }
                    className="min-h-11 w-24 rounded-xl border border-border bg-background px-3 text-center tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                  />
                  <span className="text-sm text-foreground/60">%</span>
                </div>
              </div>
            )
          })}

          <div className="flex items-center justify-between px-1 text-sm">
            <span className="text-foreground/60">
              {t('adjudication.decide.total')}
            </span>
            <span
              className={
                total === 100
                  ? 'font-bold tabular-nums text-success'
                  : 'font-bold tabular-nums text-danger'
              }
              dir="ltr"
            >
              {total}%
            </span>
          </div>

          {total !== 100 ? (
            <p className="text-sm text-danger">
              {t('adjudication.decide.mustEqual')}
            </p>
          ) : null}
        </div>

        {override ? (
          <Alert tone="warning">
            {selectedRule
              ? t('adjudication.decide.overrideNotice')
              : t('adjudication.decide.manualNotice')}
          </Alert>
        ) : null}

        <Textarea
          label={t('adjudication.decide.justification')}
          placeholder={t('adjudication.decide.justificationPlaceholder')}
          maxLength={2000}
          value={justification}
          onChange={(event) => setJustification(event.target.value)}
        />

        {!gate.ok && gate.reason === 'justification' ? (
          <p className="text-sm text-danger">
            {t('adjudication.decide.justificationRequired')}
          </p>
        ) : null}

        <Alert tone="info">
          <span className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {t('adjudication.decide.irreversible')}
          </span>
        </Alert>

        <div>
          <Button
            size="lg"
            disabled={!gate.ok}
            loading={mutation.isPending}
            onClick={() =>
              mutation.mutate({
                caseNo: accidentCase.case_no,
                scenarioCode: scenarioCode || null,
                allocations: currentAllocations,
                justification,
              })
            }
          >
            {mutation.isPending
              ? t('adjudication.decide.submitting')
              : t('adjudication.decide.submit')}
          </Button>
        </div>
      </section>
    </div>
  )
}
