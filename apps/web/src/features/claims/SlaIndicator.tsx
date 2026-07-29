import { Clock, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { useCountdown } from '@/hooks/useCountdown'
import type { Claim } from '@/lib/api/types'

/**
 * The SLA expectation, in the words a claimant actually wants: how long the
 * insurer still has, or how far past the deadline they are.
 *
 * Like the objection countdown, this ticks from the server's
 * `sla_seconds_remaining` rather than diffing `sla_due_at` against the device
 * clock. Overdue claims are not counted down live — a static "X days past" is
 * the honest reading, and a second-by-second overdue timer would be theatre.
 */
export function SlaIndicator({
  claim,
  className,
}: {
  claim: Claim
  className?: string
}) {
  const { t } = useTranslation()

  const isFinished = claim.status === 'settled' || claim.status === 'closed'
  const overdue = claim.sla_seconds_remaining < 0

  // Only run the ticking clock when there is something to count down to.
  const live = useCountdown(
    !isFinished && !overdue ? claim.sla_seconds_remaining : 0,
  )

  if (isFinished) {
    return (
      <p className={cn('text-sm text-success', className)}>
        {t('claims.sla.met')}
      </p>
    )
  }

  if (overdue) {
    const overdueSeconds = Math.abs(claim.sla_seconds_remaining)
    const days = Math.floor(overdueSeconds / 86400)
    const hours = Math.floor(overdueSeconds / 3600)

    return (
      <p
        className={cn(
          'flex items-center gap-2 text-sm font-medium text-danger',
          className,
        )}
      >
        <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
        {days >= 1
          ? t('claims.sla.breached', { days })
          : t('claims.sla.breachedHours', { hours })}
      </p>
    )
  }

  const days = Math.floor(live / 86400)
  const hours = Math.floor((live % 86400) / 3600)
  const minutes = Math.floor((live % 3600) / 60)

  return (
    <p
      className={cn(
        'flex items-center gap-2 text-sm text-foreground/70',
        className,
      )}
    >
      <Clock className="size-4 shrink-0" aria-hidden="true" />
      <span className="tabular-nums" dir="ltr">
        {days >= 1
          ? t('claims.sla.remaining', { days, hours })
          : hours >= 1
            ? t('claims.sla.remainingHours', { hours, minutes })
            : t('claims.sla.remainingMinutes', { minutes })}
      </span>
    </p>
  )
}
