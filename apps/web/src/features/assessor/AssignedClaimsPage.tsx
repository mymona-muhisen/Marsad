import { useQuery } from '@tanstack/react-query'
import { Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { StatusChip } from '@/components/ui/StatusChip'
import { SlaIndicator } from '@/features/claims/SlaIndicator'
import { assignedClaimsQueryKey, fetchAssignedClaims } from './api'

export function AssignedClaimsPage() {
  const { t } = useTranslation()

  const claims = useQuery({
    queryKey: assignedClaimsQueryKey,
    queryFn: fetchAssignedClaims,
  })

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('assessor.title')}
        </h1>
        <p className="mt-3 text-sm leading-7 text-foreground/65">
          {t('assessor.subtitle')}
        </p>
      </header>

      {claims.isPending ? (
        <p className="flex items-center gap-3 text-sm text-foreground/60">
          <Spinner className="size-4 text-primary" />
          {t('common.loading')}
        </p>
      ) : null}

      {claims.isError ? (
        <Alert tone="danger">
          {t('errors.network')}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => void claims.refetch()}
          >
            {t('common.retry')}
          </button>
        </Alert>
      ) : null}

      {claims.data && claims.data.data.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-foreground/60">
          {t('assessor.empty')}
        </p>
      ) : null}

      {claims.data && claims.data.data.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {claims.data.data.map((claim) => (
            <li key={claim.id}>
              <Link
                to={`/app/estimates/${claim.id}`}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-border p-5 transition hover:border-primary/40 hover:bg-primary/4"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Wrench className="size-5" aria-hidden="true" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold tabular-nums" dir="ltr">
                      {claim.case_no ?? `#${claim.id}`}
                    </span>
                    <StatusChip status={claim.status} kind="claim" />
                  </span>
                  <span className="mt-2 block">
                    <SlaIndicator claim={claim} />
                  </span>
                </span>

                <span className="shrink-0 text-sm font-medium text-primary">
                  {t('assessor.open')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
