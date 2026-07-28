import { useQuery } from '@tanstack/react-query'
import { CarFront } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { TextField } from '@/components/ui/TextField'
import { cn } from '@/lib/utils'
import { fetchVehicles, vehiclesQueryKey } from '@/features/vehicles/api'
import type { ReportDraft } from '../draft'

type Props = {
  draft: ReportDraft
  onChange: (patch: Partial<ReportDraft>) => void
}

/** `datetime-local` needs "YYYY-MM-DDTHH:mm" in local time, not an ISO string. */
function nowForInput(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 16)
}

export function VehicleStep({ draft, onChange }: Props) {
  const { t } = useTranslation()

  const vehicles = useQuery({
    queryKey: vehiclesQueryKey,
    queryFn: fetchVehicles,
  })

  const list = vehicles.data?.data ?? []

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">
          {t('report.vehicle.title')}
        </h2>

        {vehicles.isPending ? (
          <p className="flex items-center gap-3 text-sm text-foreground/60">
            <Spinner className="size-4 text-primary" />
            {t('common.loading')}
          </p>
        ) : null}

        {vehicles.isError ? (
          <Alert tone="danger">{t('errors.network')}</Alert>
        ) : null}

        {vehicles.data && list.length === 0 ? (
          <Alert tone="warning">
            <p>{t('report.vehicle.noVehicles')}</p>
            <Link
              to="/app/vehicles"
              className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold"
            >
              {t('report.vehicle.goToVehicles')}
            </Link>
          </Alert>
        ) : null}

        {/* Radio cards rather than a select: one tap, large target, and every
            option visible at once on a phone. */}
        <ul className="flex flex-col gap-3">
          {list.map((vehicle) => {
            const selected = draft.vehicleId === vehicle.id
            return (
              <li key={vehicle.id}>
                <label
                  className={cn(
                    'flex min-h-16 cursor-pointer items-center gap-4 rounded-2xl border p-4 transition',
                    selected
                      ? 'border-primary bg-primary/8'
                      : 'border-border hover:bg-foreground/4',
                  )}
                >
                  <input
                    type="radio"
                    name="vehicle"
                    className="size-5 accent-[var(--primary)]"
                    checked={selected}
                    onChange={() => onChange({ vehicleId: vehicle.id })}
                  />
                  <CarFront
                    className="size-5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span>
                    <span className="block font-semibold" dir="ltr">
                      {vehicle.plate_no}
                    </span>
                    <span className="block text-sm text-foreground/60">
                      {vehicle.make} {vehicle.model}
                    </span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <TextField
          label={t('report.vehicle.occurredAt')}
          hint={t('report.vehicle.occurredAtHint')}
          type="datetime-local"
          max={nowForInput()}
          value={draft.occurredAt}
          onChange={(event) => onChange({ occurredAt: event.target.value })}
          dir="ltr"
          className="text-start"
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">
          {t('report.vehicle.injuryQuestion')}
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { value: true, label: t('report.vehicle.injuryYes') },
            { value: false, label: t('report.vehicle.injuryNo') },
          ].map((option) => {
            const selected = draft.injuryFlag === option.value
            return (
              <label
                key={String(option.value)}
                className={cn(
                  'flex min-h-16 cursor-pointer items-center gap-4 rounded-2xl border p-4 transition',
                  selected
                    ? 'border-primary bg-primary/8'
                    : 'border-border hover:bg-foreground/4',
                )}
              >
                <input
                  type="radio"
                  name="injury"
                  className="size-5 accent-[var(--primary)]"
                  checked={selected}
                  onChange={() => onChange({ injuryFlag: option.value })}
                />
                <span className="font-medium">{option.label}</span>
              </label>
            )
          })}
        </div>

        {/* Triage routes injury cases to the authority — say so before they
            submit, and put the emergency instruction first. */}
        {draft.injuryFlag === true ? (
          <Alert tone="danger">{t('report.vehicle.injuryWarning')}</Alert>
        ) : null}
      </section>
    </div>
  )
}
