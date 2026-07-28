import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Camera, Plus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import { compressImage } from '../image'
import { PHOTO_SLOTS, type PhotoSlot } from '../steps'

type Props = {
  photos: Partial<Record<PhotoSlot, File>>
  extraPhotos: File[]
  onSlotChange: (slot: PhotoSlot, file: File) => void
  onExtraAdd: (file: File) => void
  onExtraRemove: (index: number) => void
}

/** Creates a preview URL and revokes it when the file changes or unmounts. */
function useObjectUrl(file: File | undefined | null): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])

  return url
}

/**
 * The ghost frame from the design brief: corner marks the user lines the scene
 * up inside. Drawn in CSS rather than as an image so it stays crisp at every
 * screen size and costs no extra request on a bad connection.
 */
function GhostFrame() {
  const corner = 'absolute size-8 border-primary/45'
  return (
    <div aria-hidden="true" className="absolute inset-4">
      <span className={cn(corner, 'start-0 top-0 border-s-2 border-t-2')} />
      <span className={cn(corner, 'end-0 top-0 border-e-2 border-t-2')} />
      <span className={cn(corner, 'bottom-0 start-0 border-b-2 border-s-2')} />
      <span className={cn(corner, 'bottom-0 end-0 border-b-2 border-e-2')} />
    </div>
  )
}

function SlotCard({
  slot,
  file,
  onPick,
}: {
  slot: PhotoSlot
  file: File | undefined
  onPick: (file: File) => void
}) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const preview = useObjectUrl(file)

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0]
    // Reset immediately so re-picking the same file still fires a change.
    event.target.value = ''
    if (!picked) return

    setBusy(true)
    try {
      onPick(await compressImage(picked))
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="overflow-hidden rounded-2xl border border-border">
      <div className="p-5">
        <h3 className="font-semibold">{t(`report.photos.slots.${slot}.label`)}</h3>
        <p className="mt-1.5 text-sm leading-6 text-foreground/60">
          {t(`report.photos.slots.${slot}.hint`)}
        </p>
      </div>

      <div className="relative aspect-4/3 bg-foreground/4">
        {preview ? (
          <img
            src={preview}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <>
            <GhostFrame />
            <Camera
              className="absolute left-1/2 top-1/2 size-9 -translate-x-1/2 -translate-y-1/2 text-primary/45"
              aria-hidden="true"
            />
          </>
        )}

        {busy ? (
          <div className="absolute inset-0 flex items-center justify-center gap-3 bg-background/75 text-sm">
            <Spinner className="size-4 text-primary" />
            {t('report.photos.compressing')}
          </div>
        ) : null}
      </div>

      <div className="p-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          // Opens the rear camera directly on a phone instead of a file picker.
          capture="environment"
          className="sr-only"
          aria-label={t(`report.photos.slots.${slot}.label`)}
          onChange={(event) => void handleChange(event)}
        />
        <Button
          type="button"
          variant={file ? 'secondary' : 'primary'}
          block
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {file ? t('report.photos.retake') : t('report.photos.capture')}
        </Button>
      </div>
    </li>
  )
}

function ExtraThumb({
  file,
  onRemove,
}: {
  file: File
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const preview = useObjectUrl(file)

  return (
    <li className="relative aspect-square overflow-hidden rounded-xl border border-border">
      {preview ? (
        <img src={preview} alt="" className="size-full object-cover" />
      ) : null}
      <button
        type="button"
        onClick={onRemove}
        aria-label={t('report.photos.remove')}
        className="absolute end-2 top-2 flex size-8 items-center justify-center rounded-full bg-background/85 text-danger"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </li>
  )
}

export function PhotosStep({
  photos,
  extraPhotos,
  onSlotChange,
  onExtraAdd,
  onExtraRemove,
}: Props) {
  const { t } = useTranslation()
  const extraInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const handleExtra = async (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (picked.length === 0) return

    setBusy(true)
    try {
      for (const file of picked) {
        onExtraAdd(await compressImage(file))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-xl font-semibold tracking-tight">
          {t('report.photos.title')}
        </h2>
        <p className="mt-2 text-sm leading-7 text-foreground/60">
          {t('report.photos.subtitle')}
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {PHOTO_SLOTS.map((slot) => (
          <SlotCard
            key={slot}
            slot={slot}
            file={photos[slot]}
            onPick={(file) => onSlotChange(slot, file)}
          />
        ))}
      </ul>

      <section className="flex flex-col gap-4">
        <div>
          <h3 className="font-semibold">{t('report.photos.extraTitle')}</h3>
          <p className="mt-1 text-sm text-foreground/60">
            {t('report.photos.extraHint')}
          </p>
        </div>

        {extraPhotos.length > 0 ? (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {extraPhotos.map((file, index) => (
              <ExtraThumb
                key={`${file.name}-${index}`}
                file={file}
                onRemove={() => onExtraRemove(index)}
              />
            ))}
          </ul>
        ) : null}

        <input
          ref={extraInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          aria-label={t('report.photos.addExtra')}
          onChange={(event) => void handleExtra(event)}
        />
        <div>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            loading={busy}
            onClick={() => extraInputRef.current?.click()}
          >
            {!busy ? <Plus className="size-4" aria-hidden="true" /> : null}
            {busy ? t('report.photos.compressing') : t('report.photos.addExtra')}
          </Button>
        </div>
      </section>
    </div>
  )
}
