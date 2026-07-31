import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { DispatchCard } from './DispatchCard'
import { dispatchesQueryKey, fetchDispatches } from './api'

export function DispatchesPage() {
  const { t } = useTranslation()

  const dispatches = useQuery({
    queryKey: dispatchesQueryKey,
    queryFn: fetchDispatches,
  })

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('surveyor.title')}
        </h1>
        <p className="mt-3 text-sm leading-7 text-foreground/65">
          {t('surveyor.subtitle')}
        </p>
      </header>

      {dispatches.isPending ? (
        <p className="flex items-center gap-3 text-sm text-foreground/60">
          <Spinner className="size-4 text-primary" />
          {t('common.loading')}
        </p>
      ) : null}

      {dispatches.isError ? (
        <Alert tone="danger">
          {t('errors.network')}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => void dispatches.refetch()}
          >
            {t('common.retry')}
          </button>
        </Alert>
      ) : null}

      {dispatches.data && dispatches.data.data.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-foreground/60">
          {t('surveyor.empty')}
        </p>
      ) : null}

      {dispatches.data && dispatches.data.data.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {dispatches.data.data.map((dispatch) => (
            <DispatchCard key={dispatch.id} dispatch={dispatch} />
          ))}
        </ul>
      ) : null}
    </div>
  )
}
