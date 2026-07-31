import { useCallback, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { PhotosStep } from '@/features/report/steps/PhotosStep'
import { PHOTO_SLOTS, type PhotoSlot } from '@/features/report/steps'
import { ApiError } from '@/lib/api/errors'
import { newIdempotencyKey } from '@/lib/idempotency'
import { formatDateTime } from '@/lib/format'
import { useLocale } from '@/i18n/useLocale'
import { cn } from '@/lib/utils'
import type { Dispatch } from '@/lib/api/types'
import {
  acceptDispatch,
  completeDispatch,
  declineDispatch,
  dispatchesQueryKey,
  markOnScene,
} from './api'

const STATUS_TONES: Record<string, string> = {
  assigned: 'border-warning/30 bg-warning/12 text-warning',
  accepted: 'border-primary/25 bg-primary/10 text-primary',
  on_scene: 'border-primary/25 bg-primary/10 text-primary',
  completed: 'border-success/30 bg-success/12 text-success',
  declined: 'border-foreground/15 bg-foreground/6 text-foreground/70',
}

/**
 * One field assignment, with the whole accept → on-scene → complete run in
 * place rather than on a separate screen: a surveyor works this standing at a
 * roadside on a phone, and every extra navigation is a chance to lose it.
 */
export function DispatchCard({ dispatch }: { dispatch: Dispatch }) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const queryClient = useQueryClient()

  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  const [photos, setPhotos] = useState<Partial<Record<PhotoSlot, File>>>({})
  const [extraPhotos, setExtraPhotos] = useState<File[]>([])
  // Minted per slot and reused on a retake — `photo_keys` is required by the
  // API here, one per photo.
  const [photoKeys, setPhotoKeys] = useState<Record<string, string>>({})
  const [extraKeys, setExtraKeys] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: dispatchesQueryKey })

  const onError = (cause: unknown) =>
    setError(
      cause instanceof ApiError && cause.isOffline
        ? t('errors.network')
        : cause instanceof ApiError && cause.message
          ? cause.message
          : t('errors.unexpected'),
    )

  const accept = useMutation({
    mutationFn: () => acceptDispatch(dispatch.id),
    onSuccess: async () => {
      setError(null)
      await invalidate()
    },
    onError,
  })

  const decline = useMutation({
    mutationFn: () => declineDispatch({ id: dispatch.id, reason }),
    onSuccess: async () => {
      setError(null)
      setDeclining(false)
      await invalidate()
    },
    onError,
  })

  const onScene = useMutation({
    mutationFn: () => markOnScene(dispatch.id),
    onSuccess: async () => {
      setError(null)
      await invalidate()
    },
    onError,
  })

  const complete = useMutation({
    mutationFn: () => {
      const ordered = PHOTO_SLOTS.filter(
        (slot) => photos[slot] instanceof File,
      )
      return completeDispatch({
        id: dispatch.id,
        photos: [
          ...ordered.map((slot) => photos[slot] as File),
          ...extraPhotos,
        ],
        photoKeys: [
          ...ordered.map((slot) => photoKeys[slot]),
          ...extraKeys.slice(0, extraPhotos.length),
        ],
      })
    },
    onSuccess: async () => {
      setError(null)
      await invalidate()
    },
    onError,
  })

  const setSlot = useCallback((slot: PhotoSlot, file: File) => {
    setPhotos((current) => ({ ...current, [slot]: file }))
    setPhotoKeys((current) =>
      current[slot] ? current : { ...current, [slot]: newIdempotencyKey() },
    )
    setError(null)
  }, [])

  const addExtra = useCallback((file: File) => {
    setExtraPhotos((current) => [...current, file])
    setExtraKeys((current) => [...current, newIdempotencyKey()])
  }, [])

  const removeExtra = useCallback((index: number) => {
    setExtraPhotos((current) => current.filter((_, i) => i !== index))
    setExtraKeys((current) => current.filter((_, i) => i !== index))
  }, [])

  const submitComplete = () => {
    if (!PHOTO_SLOTS.every((slot) => photos[slot])) {
      setError(t('surveyor.capture.photosRequired'))
      return
    }
    setError(null)
    complete.mutate()
  }

  const details = dispatch.case

  return (
    <li className="flex flex-col gap-5 rounded-2xl border border-border p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-semibold tabular-nums" dir="ltr">
          {details?.case_no ?? `#${dispatch.id}`}
        </span>
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
            STATUS_TONES[dispatch.status] ?? STATUS_TONES.declined,
          )}
        >
          {t(`dispatchStatus.${dispatch.status}`)}
        </span>
        {dispatch.zone ? (
          <span className="text-sm text-foreground/55">
            {t('surveyor.zone')}: {dispatch.zone}
          </span>
        ) : null}
      </div>

      {/* Before anything else: is someone hurt? */}
      {details?.injury_flag ? (
        <Alert tone="danger">
          <span className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {t('surveyor.injuryWarning')}
          </span>
        </Alert>
      ) : null}

      {details ? (
        <div className="flex flex-col gap-2">
          <p className="flex items-start gap-2 text-sm leading-7">
            <MapPin className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              {details.region ? `${details.region} — ` : ''}
              {details.location_description || t('surveyor.noAddress')}
            </span>
          </p>

          {!details.location_verified ? (
            <p className="text-sm text-warning">
              {t('surveyor.unverifiedLocation')}
            </p>
          ) : null}

          <p className="text-sm text-foreground/55">
            {formatDateTime(details.occurred_at, locale)}
          </p>

          <div>
            <Link
              to={`/app/cases/${encodeURIComponent(details.case_no)}`}
              className="text-sm text-primary hover:underline"
            >
              {t('surveyor.openCase')}
            </Link>
          </div>
        </div>
      ) : null}

      {dispatch.assigned_at ? (
        <p className="text-sm text-foreground/50">
          {t('surveyor.assignedAt')}:{' '}
          {formatDateTime(dispatch.assigned_at, locale)}
        </p>
      ) : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {dispatch.status === 'assigned' ? (
        declining ? (
          <div className="flex flex-col gap-3">
            <TextField
              label={t('surveyor.actions.declineTitle')}
              placeholder={t('surveyor.actions.declinePlaceholder')}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={255}
              hint={t('surveyor.actions.declineHint')}
            />
            <div className="flex flex-wrap gap-3">
              <Button
                variant="danger"
                loading={decline.isPending}
                onClick={() => {
                  if (reason.trim().length === 0) {
                    setError(t('surveyor.actions.declineReasonRequired'))
                    return
                  }
                  decline.mutate()
                }}
              >
                {t('surveyor.actions.confirmDecline')}
              </Button>
              <Button variant="ghost" onClick={() => setDeclining(false)}>
                {t('surveyor.actions.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button size="lg" loading={accept.isPending} onClick={() => accept.mutate()}>
              {accept.isPending
                ? t('surveyor.actions.accepting')
                : t('surveyor.actions.accept')}
            </Button>
            <Button variant="ghost" onClick={() => setDeclining(true)}>
              {t('surveyor.actions.decline')}
            </Button>
          </div>
        )
      ) : null}

      {dispatch.status === 'accepted' ? (
        <div>
          <Button
            size="lg"
            loading={onScene.isPending}
            onClick={() => onScene.mutate()}
          >
            {onScene.isPending
              ? t('surveyor.actions.markingOnScene')
              : t('surveyor.actions.onScene')}
          </Button>
        </div>
      ) : null}

      {dispatch.status === 'on_scene' ? (
        <div className="flex flex-col gap-5">
          <div>
            <h3 className="font-semibold">{t('surveyor.capture.title')}</h3>
            <p className="mt-1.5 text-sm leading-7 text-foreground/60">
              {t('surveyor.capture.subtitle')}
            </p>
          </div>

          <PhotosStep
            photos={photos}
            extraPhotos={extraPhotos}
            onSlotChange={setSlot}
            onExtraAdd={addExtra}
            onExtraRemove={removeExtra}
          />

          <div>
            <Button
              size="lg"
              loading={complete.isPending}
              onClick={submitComplete}
            >
              {complete.isPending
                ? t('surveyor.actions.completing')
                : t('surveyor.actions.complete')}
            </Button>
          </div>
        </div>
      ) : null}

      {dispatch.status === 'declined' ? (
        <div className="rounded-xl bg-foreground/4 p-4">
          <p className="text-sm font-medium">{t('surveyor.declined.title')}</p>
          {dispatch.decline_reason ? (
            <p className="mt-1 text-sm text-foreground/65">
              {t('surveyor.declined.reason')}: {dispatch.decline_reason}
            </p>
          ) : null}
        </div>
      ) : null}

      {dispatch.status === 'completed' ? (
        <Alert tone="success" title={t('surveyor.completed.title')}>
          {t('surveyor.completed.body')}
        </Alert>
      ) : null}
    </li>
  )
}
