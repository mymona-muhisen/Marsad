import { apiFetch } from '@/lib/api/client'
import type { AccidentCase } from '@/lib/api/types'

export type CreateCaseInput = {
  vehicleId: number
  /** ISO 8601 — the API takes dates in ISO and localises in the UI. */
  occurredAt: string
  lat: number
  lng: number
  locationVerified: boolean
  locationDescription?: string
  region?: string
  injuryFlag: boolean
  statement: string
  photos: File[]
  hitAndRun: boolean
  counterpartyPhone?: string
  counterpartyPlate?: string
  /** Survives reloads and retries — see `lib/idempotency.ts`. */
  idempotencyKey?: string
  /** One per photo, in the same order as `photos`. */
  photoKeys?: string[]
}

/** Laravel's `boolean` rule accepts "1"/"0"; FormData can only carry strings. */
const bool = (value: boolean) => (value ? '1' : '0')

export function buildCaseFormData(input: CreateCaseInput): FormData {
  const form = new FormData()

  form.set('vehicle_id', String(input.vehicleId))
  form.set('occurred_at', input.occurredAt)
  form.set('lat', String(input.lat))
  form.set('lng', String(input.lng))
  form.set('location_verified', bool(input.locationVerified))
  form.set('injury_flag', bool(input.injuryFlag))
  form.set('statement', input.statement)
  form.set('hit_and_run', bool(input.hitAndRun))

  if (input.locationDescription) {
    form.set('location_description', input.locationDescription)
  }
  // Feeds the heatmap's grouping column; absent for a pure GPS report.
  if (input.region) {
    form.set('region', input.region)
  }

  // Omit rather than send empty strings: `counterparty_phone` is validated by
  // a regex that an empty string would fail, and it is optional for hit-and-run.
  if (input.counterpartyPhone) {
    form.set('counterparty_phone', input.counterpartyPhone)
  }
  if (input.counterpartyPlate) {
    form.set('counterparty_plate', input.counterpartyPlate)
  }

  if (input.idempotencyKey) {
    form.set('idempotency_key', input.idempotencyKey)
  }

  for (const photo of input.photos) {
    form.append('photos[]', photo, photo.name)
  }

  // Appended as a parallel array: the API zips it against `photos` by index,
  // so the two must be sent in the same order and never partially.
  if (input.photoKeys && input.photoKeys.length === input.photos.length) {
    for (const key of input.photoKeys) {
      form.append('idempotency_keys[]', key)
    }
  }

  return form
}

export function createCase(
  input: CreateCaseInput,
): Promise<{ data: AccidentCase }> {
  return apiFetch<{ data: AccidentCase }>('cases', {
    method: 'POST',
    body: buildCaseFormData(input),
  })
}
