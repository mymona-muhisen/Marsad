import { useQuery } from '@tanstack/react-query'
import { Scale } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { StatusChip } from '@/components/ui/StatusChip'
import { formatDateTime } from '@/lib/format'
import { useLocale } from '@/i18n/useLocale'
import { fetchQueue, queueQueryKey } from './api'

export function QueuePage() {
  const { t } = useTranslation()
  const { locale } = useLocale()

  const queue = useQuery({ queryKey: queueQueryKey, queryFn: fetchQueue })

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('adjudication.queue.title')}
        </h1>
        <p className="mt-3 text-sm leading-7 text-foreground/65">
          {t('adjudication.queue.subtitle')}
        </p>
      </header>

      {queue.isPending ? (
        <p className="flex items-center gap-3 text-sm text-foreground/60">
          <Spinner className="size-4 text-primary" />
          {t('common.loading')}
        </p>
      ) : null}

      {queue.isError ? (
        <Alert tone="danger">
          {t('errors.network')}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => void queue.refetch()}
          >
            {t('common.retry')}
          </button>
        </Alert>
      ) : null}

      {queue.data && queue.data.data.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-foreground/60">
          {t('adjudication.queue.empty')}
        </p>
      ) : null}

      {queue.data && queue.data.data.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {queue.data.data.map((item) => {
            const parties = item.parties ?? []
            const statements = parties.filter(
              (party) => (party.statement_text ?? '').trim().length > 0,
            ).length

            return (
              <li key={item.case_no}>
                <Link
                  to={`/app/adjudication/cases/${encodeURIComponent(item.case_no)}`}
                  className="group flex flex-wrap items-center gap-4 rounded-2xl border border-border p-5 transition hover:border-primary/40 hover:bg-primary/4"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Scale className="size-5" aria-hidden="true" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-3">
                      <span className="font-semibold tabular-nums" dir="ltr">
                        {item.case_no}
                      </span>
                      <StatusChip status={item.status} />
                    </span>
                    <span className="mt-1.5 block text-sm text-foreground/60">
                      {formatDateTime(item.occurred_at, locale)}
                      {item.region ? ` · ${item.region}` : ''}
                    </span>
                  </span>

                  {/* Lets the reviewer pick a case that is actually ready
                      rather than opening one to find a statement missing. */}
                  <span className="flex shrink-0 gap-4 text-sm text-foreground/60">
                    <span>
                      {t('adjudication.queue.parties', { count: parties.length })}
                    </span>
                    <span>
                      {t('adjudication.queue.statements', { count: statements })}
                    </span>
                  </span>

                  <span className="shrink-0 text-sm font-medium text-primary">
                    {t('adjudication.queue.review')}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
