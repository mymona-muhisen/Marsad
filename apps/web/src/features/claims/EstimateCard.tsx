import { TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { formatDateTime, formatMoney } from '@/lib/format'
import { useLocale } from '@/i18n/useLocale'
import type { DamageEstimate } from '@/lib/api/types'

/** One submitted damage estimate with its line items and deviation flags. */
export function EstimateCard({ estimate }: { estimate: DamageEstimate }) {
  const { t } = useTranslation()
  const { locale } = useLocale()

  return (
    <article className="overflow-hidden rounded-2xl border border-border">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <p className="font-semibold">
            {t(`claims.estimates.types.${estimate.type}`)}
          </p>
          <p className="mt-1 text-sm text-foreground/55">
            {t(`claims.estimates.statuses.${estimate.status}`)} ·{' '}
            {formatDateTime(estimate.created_at, locale)}
          </p>
        </div>
        <p className="text-lg font-bold" dir="ltr">
          {formatMoney(estimate.total, locale)}
        </p>
      </header>

      {estimate.items && estimate.items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-start text-foreground/55">
                <th scope="col" className="p-4 text-start font-medium">
                  {t('claims.estimates.description')}
                </th>
                <th scope="col" className="p-4 text-start font-medium">
                  {t('claims.estimates.qty')}
                </th>
                <th scope="col" className="p-4 text-start font-medium">
                  {t('claims.estimates.unitPrice')}
                </th>
                <th scope="col" className="p-4 text-start font-medium">
                  {t('claims.estimates.lineTotal')}
                </th>
              </tr>
            </thead>
            <tbody>
              {estimate.items.map((item) => (
                <tr key={item.id} className="border-b border-border/60">
                  <td className="p-4">
                    <span className="flex flex-wrap items-center gap-2">
                      {item.description}
                      {/* FR-CL3 — the claimant sees which line the insurer
                          will question, not just the total. */}
                      {item.deviation_flag ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/12 px-2 py-0.5 text-xs text-warning">
                          <TriangleAlert className="size-3" aria-hidden="true" />
                          {t('claims.estimates.deviation')}
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="p-4 tabular-nums" dir="ltr">
                    {item.qty}
                  </td>
                  <td className="p-4 tabular-nums" dir="ltr">
                    {formatMoney(item.unit_price, locale)}
                  </td>
                  <td className="p-4 tabular-nums" dir="ltr">
                    {formatMoney(item.line_total, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </article>
  )
}
