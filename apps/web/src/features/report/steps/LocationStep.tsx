import { useState } from 'react'
import { MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { Textarea } from '@/components/ui/Textarea'
import { REGIONS, findRegion, regionLabel } from '@/lib/regions'
import { useLocale } from '@/i18n/useLocale'
import type { ReportDraft } from '../draft'

type Props = {
  draft: ReportDraft
  onChange: (patch: Partial<ReportDraft>) => void
}

/** Enough precision for a street position; more digits are GPS noise. */
const PRECISION = 6

/**
 * Location capture, written for someone who has no idea what a latitude is.
 *
 * The device fix is the primary path and needs no network — GPS is hardware, so
 * it works on a roadside with no data. When it fails, the fallback is a place
 * the reporter can actually name: governorate plus a written street location.
 * Raw coordinates remain available but are demoted behind a disclosure, since
 * asking a driver at a crash site to type decimal degrees is not a real option.
 */
export function LocationStep({ draft, onChange }: Props) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const [locating, setLocating] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [showCoordinates, setShowCoordinates] = useState(false)

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setGpsError(t('report.location.unsupported'))
      return
    }

    setGpsError(null)
    setLocating(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        onChange({
          lat: Number(position.coords.latitude.toFixed(PRECISION)),
          lng: Number(position.coords.longitude.toFixed(PRECISION)),
          // Only a device fix counts as verified; a governorate centre does not.
          locationVerified: true,
        })
      },
      () => {
        setLocating(false)
        setGpsError(t('report.location.denied'))
      },
      // A coarse cell-tower fix beats no fix at all on a Syrian roadside, so
      // accept a cached position and do not hold out for high accuracy.
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 60_000 },
    )
  }

  const pickRegion = (code: string) => {
    const region = findRegion(code)
    if (!region) {
      onChange({ regionCode: '', lat: null, lng: null, locationVerified: false })
      return
    }

    onChange({
      regionCode: region.code,
      // The governorate centre stands in for coordinates the analytics need;
      // the written description below carries the real precision.
      lat: region.lat,
      lng: region.lng,
      locationVerified: false,
    })
  }

  const setCoordinate = (key: 'lat' | 'lng', raw: string) => {
    const value = raw.trim() === '' ? null : Number(raw)
    onChange({
      [key]: value !== null && Number.isNaN(value) ? null : value,
      locationVerified: false,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold tracking-tight">
        {t('report.location.title')}
      </h2>

      <Button size="lg" block onClick={locate} loading={locating} type="button">
        {!locating ? <MapPin className="size-5" aria-hidden="true" /> : null}
        {locating ? t('report.location.locating') : t('report.location.useGps')}
      </Button>

      {draft.locationVerified ? (
        <Alert tone="success" title={t('report.location.verified')}>
          {t('report.location.verifiedBody')}
        </Alert>
      ) : null}

      {gpsError ? <Alert tone="warning">{gpsError}</Alert> : null}

      {/* The written fallback. Shown even before GPS is attempted so a reporter
          who already knows GPS is off does not have to fail first. */}
      <section className="flex flex-col gap-5 rounded-2xl border border-border p-5">
        <div>
          <h3 className="font-semibold">{t('report.location.manualTitle')}</h3>
          <p className="mt-1.5 text-sm leading-6 text-foreground/60">
            {t('report.location.manualSubtitle')}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="report-region"
            className="text-sm font-medium text-foreground"
          >
            {t('report.location.governorate')}
          </label>
          <select
            id="report-region"
            value={draft.regionCode}
            onChange={(event) => pickRegion(event.target.value)}
            className="min-h-12 rounded-xl border border-border bg-background px-4 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
          >
            <option value="">{t('report.location.governoratePlaceholder')}</option>
            {REGIONS.map((region) => (
              <option key={region.code} value={region.code}>
                {regionLabel(region, locale)}
              </option>
            ))}
          </select>
        </div>

        <Textarea
          label={t('report.location.address')}
          placeholder={t('report.location.addressPlaceholder')}
          hint={t('report.location.addressHint')}
          maxLength={255}
          className="min-h-28"
          value={draft.locationDescription}
          onChange={(event) =>
            onChange({ locationDescription: event.target.value })
          }
        />
      </section>

      <div>
        <button
          type="button"
          onClick={() => setShowCoordinates((open) => !open)}
          className="text-sm text-primary underline"
        >
          {t('report.location.toggleCoordinates')}
        </button>
      </div>

      {showCoordinates ? (
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
      ) : null}
    </div>
  )
}
