import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/format'
import { useLocale } from '@/i18n/useLocale'
import type { Claim } from '@/lib/api/types'

/**
 * The claim timeline, straight from `claim_events`.
 *
 * Unlike the case view, nothing here is derived: doc 04 §2.5 records every
 * mutation as a row precisely because "status alone loses history", so each
 * entry is an actual logged event with its own timestamp and — for insurer
 * decisions — the reason code the API makes mandatory.
 */
export function ClaimTimeline({ claim }: { claim: Claim }) {
  const { t } = useTranslation()
  const { locale } = useLocale()

  const events = claim.events ?? []

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold tracking-tight">
        {t('claims.timeline.title')}
      </h2>

      {events.length === 0 ? (
        <p className="text-sm text-foreground/60">
          {t('claims.timeline.empty')}
        </p>
      ) : (
        <ol className="relative flex flex-col gap-5 border-s border-border ps-6">
          {events.map((event) => {
            const breach = event.action === 'sla_breached'

            return (
              <li key={event.id} className="relative">
                <span
                  className={cn(
                    'absolute -start-[1.72rem] top-1.5 size-3 rounded-full ring-4 ring-background',
                    breach ? 'bg-danger' : 'bg-primary',
                  )}
                  aria-hidden="true"
                />
                <p className={breach ? 'font-medium text-danger' : 'font-medium'}>
                  {t(`claims.timeline.actions.${event.action}`)}
                </p>

                <p className="mt-1 text-sm text-foreground/55">
                  {formatDateTime(event.created_at, locale)}
                </p>

                {/* Reason codes are mandatory on insurer decisions — showing
                    them is the whole point of that rule for the claimant. */}
                {event.reason_code ? (
                  <p className="mt-2 text-sm">
                    <span className="text-foreground/55">
                      {t('claims.timeline.reason')}:{' '}
                    </span>
                    {t(`claims.reasonCodes.${event.reason_code}`, {
                      defaultValue: event.reason_code,
                    })}
                  </p>
                ) : null}

                {event.note ? (
                  <p className="mt-1 text-sm leading-7 text-foreground/75">
                    {event.note}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
