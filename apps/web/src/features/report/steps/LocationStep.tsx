import { useState } from 'react'
import { MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import type { ReportDraft } from '../draft'

type Props = {
  draft: ReportDraft
  onChange: (patch: Partial<ReportDraft>) => void
}

/** Enough precision for a street position; more digits are GPS noise. */
const PRECISION = 6

export function LocationStep({ draft, onChange }: Props) {
  const { t } = useTranslation()
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setError(t('report.location.unsupported'))
      return
    }

    setError(null)
    setLocating(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        onChange({
          lat: Number(position.coords.latitude.toFixed(PRECISION)),
          lng: Number(position.coords.longitude.toFixed(PRECISION)),
          // Only a device fix counts as verified; typed coordinates do not.
          locationVerified: true,
        })
      },
      () => {
        setLocating(false)
        setError(t('report.location.denied'))
      },
      // A coarse cell-tower fix beats no fix at all on a Syrian roadside, so
      // accept a cached position and do not hold out for high accuracy.
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 60_000 },
    )
  }

  const setCoordinate = (key: 'lat' | 'lng', raw: string) => {
    const value = raw.trim() === '' ? null : Number(raw)
    onChange({
      [key]: value !== null && Number.isNaN(value) ? null : value,
      locationVerified: false,
    })
  }

  const hasFix = draft.lat !== null && draft.lng !== null

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold tracking-tight">
        {t('report.location.title')}
      </h2>

      <Button size="lg" block onClick={locate} loading={locating} type="button">
        {!locating ? <MapPin className="size-5" aria-hidden="true" /> : null}
        {locating ? t('report.location.locating') : t('report.location.useGps')}
      </Button>

      {error ? <Alert tone="warning">{error}</Alert> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label={t('report.location.lat')}
          value={draft.lat ?? ''}
          onChange={(event) => setCoordinate('lat', event.target.value)}
          inputMode="decimal"
          dir="ltr"
          className="text-start"
        />
        <TextField
          label={t('report.location.lng')}
          value={draft.lng ?? ''}
          onChange={(event) => setCoordinate('lng', event.target.value)}
          inputMode="decimal"
          dir="ltr"
          className="text-start"
        />
      </div>

      <p className="text-sm leading-7 text-foreground/55">
        {t('report.location.manualHint')}
      </p>

      {hasFix ? (
        <Alert tone={draft.locationVerified ? 'success' : 'info'}>
          {draft.locationVerified
            ? t('report.location.verified')
            : t('report.location.manual')}
        </Alert>
      ) : null}
    </div>
  )
}
