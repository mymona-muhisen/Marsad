import { CircleCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useLocation } from 'react-router'

import { Alert } from '@/components/ui/Alert'
import type { AccidentCase } from '@/lib/api/types'

/**
 * Post-submission confirmation. The case number is the headline: it is the only
 * public identifier the platform exposes (CLAUDE.md rule 10) and the one thing
 * the reporter needs to write down before leaving the scene.
 */
export function ReportSuccessPage() {
  const { t } = useTranslation()
  const location = useLocation()

  const submitted = (location.state as { case?: AccidentCase } | null)?.case

  // Reached by typing the URL or reloading — there is nothing to confirm.
  if (!submitted) return <Navigate to="/app" replace />

  const track = submitted.track

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-8 py-6">
      <header className="flex flex-col items-center gap-4 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
          <CircleCheck className="size-9" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('report.success.title')}
        </h1>
      </header>

      <section className="rounded-2xl border border-border p-6 text-center">
        <p className="text-sm text-foreground/55">{t('report.success.caseNo')}</p>
        <p
          className="mt-2 text-3xl font-bold tabular-nums tracking-tight"
          dir="ltr"
        >
          {submitted.case_no}
        </p>
        <p className="mt-4 text-sm leading-7 text-foreground/60">
          {t('report.success.keepNumber')}
        </p>
      </section>

      {track ? (
        <Alert
          tone={track === 'police_required' ? 'warning' : 'info'}
          title={`${t('report.success.trackLabel')}: ${t(`report.success.tracks.${track}.label`)}`}
        >
          {t(`report.success.tracks.${track}.body`)}
        </Alert>
      ) : null}

      <Link
        to="/app"
        className="inline-flex min-h-14 items-center justify-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground transition hover:brightness-110"
      >
        {t('report.success.done')}
      </Link>
    </main>
  )
}
