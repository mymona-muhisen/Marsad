import type { ReportDraft } from './draft'

/**
 * The guided capture slots (design brief: "overlay ghost frames — wide shot,
 * both cars, damage close-ups, plates"). One photo per slot is exactly the
 * backend's `photos min:4`, so filling the guide satisfies the API by
 * construction rather than by the user guessing how many to take.
 */
export const PHOTO_SLOTS = ['wide', 'vehicles', 'damage', 'plate'] as const

export type PhotoSlot = (typeof PHOTO_SLOTS)[number]

export const WIZARD_STEPS = [
  'vehicle',
  'location',
  'photos',
  'counterparty',
  'statement',
  'review',
] as const

export type WizardStep = (typeof WIZARD_STEPS)[number]

const PHONE_PATTERN = /^09\d{8}$/

export type StepState = {
  draft: ReportDraft
  photos: Partial<Record<PhotoSlot, File>>
  extraPhotos: File[]
}

/**
 * Per-step gating, mirroring `StoreCaseRequest`.
 *
 * Returning a translation key rather than a message keeps this file free of
 * user-facing strings and testable without i18n. `null` means the step is
 * complete and the user may continue.
 */
export function validateStep(
  step: WizardStep,
  { draft, photos }: StepState,
): string | null {
  switch (step) {
    case 'vehicle':
      if (!draft.vehicleId) return 'report.errors.vehicleRequired'
      if (!draft.occurredAt) return 'report.errors.occurredAtRequired'
      if (new Date(draft.occurredAt).getTime() > Date.now()) {
        return 'report.errors.occurredAtFuture'
      }
      if (draft.injuryFlag === null) return 'report.errors.injuryRequired'
      return null

    case 'location':
      if (draft.lat === null || draft.lng === null) {
        return 'report.errors.locationRequired'
      }
      if (draft.lat < -90 || draft.lat > 90) return 'report.errors.latRange'
      if (draft.lng < -180 || draft.lng > 180) return 'report.errors.lngRange'
      // Mirrors StoreCaseRequest: coordinates that did not come from the device
      // are city-scale, so a written location is mandatory alongside them.
      if (!draft.locationVerified && draft.locationDescription.trim() === '') {
        return 'report.errors.locationDescriptionRequired'
      }
      return null

    case 'photos': {
      const missing = PHOTO_SLOTS.filter((slot) => !photos[slot])
      return missing.length > 0 ? 'report.errors.photosRequired' : null
    }

    case 'counterparty':
      // Hit-and-run is the one case with no counterparty to record.
      if (draft.hitAndRun) return null
      if (!PHONE_PATTERN.test(draft.counterpartyPhone)) {
        return 'report.errors.counterpartyPhoneRequired'
      }
      return null

    case 'statement':
      if (draft.statement.trim().length === 0) {
        return 'report.errors.statementRequired'
      }
      if (draft.statement.length > 2000) return 'report.errors.statementTooLong'
      return null

    case 'review':
      return null
  }
}

/** Ordered photos for upload: the four guided slots first, then any extras. */
export function collectPhotos({ photos, extraPhotos }: StepState): File[] {
  const guided = PHOTO_SLOTS.map((slot) => photos[slot]).filter(
    (file): file is File => file instanceof File,
  )
  return [...guided, ...extraPhotos]
}

/**
 * The idempotency keys for `collectPhotos`, in exactly the same order.
 *
 * Built from the same slot list and the same filter, so a slot without a photo
 * drops its key too and the two arrays stay index-aligned — the API zips them
 * together, and a misalignment would attach a key to the wrong file.
 */
export function collectPhotoKeys(
  { photos, extraPhotos }: StepState,
  photoKeys: Record<string, string>,
  extraPhotoKeys: string[],
): string[] {
  const guided = PHOTO_SLOTS.filter((slot) => photos[slot] instanceof File).map(
    (slot) => photoKeys[slot],
  )

  return [...guided, ...extraPhotoKeys.slice(0, extraPhotos.length)]
}

/** True when every step up to and including `step` passes validation. */
export function canReachStep(step: WizardStep, state: StepState): boolean {
  const target = WIZARD_STEPS.indexOf(step)
  return WIZARD_STEPS.slice(0, target).every(
    (earlier) => validateStep(earlier, state) === null,
  )
}
