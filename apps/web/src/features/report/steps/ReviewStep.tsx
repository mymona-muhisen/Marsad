import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { fetchVehicles, vehiclesQueryKey } from '@/features/vehicles/api'
import { findRegion, regionLabel } from '@/lib/regions'
import { formatDateTime } from '@/lib/format'
import { useLocale } from '@/i18n/useLocale'
import type { ReportDraft } from '../draft'
import type { WizardStep } from '../steps'

type Props = {
  draft: ReportDraft
  photoCount: number
  onEdit: (step: WizardStep) => void
}

function Row({
  label,
  value,
  onEdit,
  editLabel,
}: {
  label: string
  value: string
  onEdit: () => void
  editLabel: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-b-0">
      <div className="min-w-0">
        <dt className="text-sm text-foreground/55">{label}</dt>
        <dd className="mt-1 font-medium wrap-break-word">{value}</dd>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-primary transition hover:bg-primary/8"
      >
        {editLabel}
      </button>
    </div>
  )
}

export function ReviewStep({ draft, photoCount, onEdit }: Props) {
  const { t } = useTranslation()
  const { locale } = useLocale()

  const vehicles = useQuery({
    queryKey: vehiclesQueryKey,
    queryFn: fetchVehicles,
  })

  const vehicle = vehicles.data?.data.find((item) => item.id === draft.vehicleId)
  const region = findRegion(draft.regionCode)
  const edit = t('report.review.edit')

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold tracking-tight">
        {t('report.review.title')}
      </h2>

      <dl className="rounded-2xl border border-border px-5">
        <Row
          label={t('report.review.vehicle')}
          value={
            vehicle
              ? `${vehicle.plate_no} — ${vehicle.make} ${vehicle.model}`
              : '—'
          }
          onEdit={() => onEdit('vehicle')}
          editLabel={edit}
        />
        <Row
          label={t('report.review.occurredAt')}
          value={
            draft.occurredAt
              ? formatDateTime(new Date(draft.occurredAt).toISOString(), locale)
              : '—'
          }
          onEdit={() => onEdit('vehicle')}
          editLabel={edit}
        />
        <Row
          label={t('report.review.injuries')}
          value={
            draft.injuryFlag ? t('report.review.yes') : t('report.review.no')
          }
          onEdit={() => onEdit('vehicle')}
          editLabel={edit}
        />
        <Row
          label={t('report.review.location')}
          // Show the place, not the numbers — the coordinates mean nothing to
          // the reporter checking their own report before sending it.
          value={
            [
              region ? regionLabel(region, locale) : null,
              draft.locationDescription.trim() || null,
              draft.locationVerified ? t('report.location.verified') : null,
            ]
              .filter(Boolean)
              .join(' — ') || '—'
          }
          onEdit={() => onEdit('location')}
          editLabel={edit}
        />
        <Row
          label={t('report.review.photos')}
          value={t('report.review.photosCount', { count: photoCount })}
          onEdit={() => onEdit('photos')}
          editLabel={edit}
        />
        <Row
          label={t('report.review.counterparty')}
          value={
            draft.hitAndRun
              ? t('report.review.hitAndRun')
              : [draft.counterpartyPhone, draft.counterpartyPlate]
                  .filter(Boolean)
                  .join(' · ') || '—'
          }
          onEdit={() => onEdit('counterparty')}
          editLabel={edit}
        />
        <Row
          label={t('report.review.statement')}
          value={draft.statement || '—'}
          onEdit={() => onEdit('statement')}
          editLabel={edit}
        />
      </dl>
    </div>
  )
}
