import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { StatusChip } from '@/components/ui/StatusChip'
import { formatDateTime } from '@/lib/format'
import { useLocale } from '@/i18n/useLocale'
import { casesQueryKey, fetchCases } from './api'

export function CasesPage() {
  const { t } = useTranslation()
  const { locale } = useLocale()

  const cases = useQuery({ queryKey: casesQueryKey, queryFn: fetchCases })

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t('cases.title')}</h1>
        <p className="mt-3 text-sm leading-7 text-foreground/65">
          {t('cases.subtitle')}
        </p>
      </header>

      {cases.isPending ? (
        <p className="flex items-center gap-3 text-sm text-foreground/60">
          <Spinner className="size-4 text-primary" />
          {t('common.loading')}
        </p>
      ) : null}

      {cases.isError ? (
        <Alert tone="danger">
          {t('errors.network')}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => void cases.refetch()}
          >
            {t('common.retry')}
          </button>
        </Alert>
      ) : null}

      {cases.data && cases.data.data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-foreground/60">{t('cases.empty')}</p>
          <Link
            to="/report/new"
            className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground transition hover:brightness-110"
          >
            {t('cases.emptyCta')}
          </Link>
        </div>
      ) : null}

      {cases.data && cases.data.data.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {cases.data.data.map((item) => (
            <li key={item.case_no}>
              <Link
                to={`/app/cases/${encodeURIComponent(item.case_no)}`}
                className="group flex items-center gap-4 rounded-2xl border border-border p-5 transition hover:border-primary/40 hover:bg-primary/4"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="size-5" aria-hidden="true" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold tabular-nums" dir="ltr">
                      {item.case_no}
                    </span>
                    <StatusChip status={item.status} />
                  </span>
                  <span className="mt-1.5 block text-sm text-foreground/60">
                    {t('cases.occurredAt')}{' '}
                    {formatDateTime(item.occurred_at, locale)}
                  </span>
                </span>

                <ArrowLeft
                  className="size-4 shrink-0 text-foreground/30 transition-transform group-hover:-translate-x-1 ltr:rotate-180"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
