import { describe, expect, it } from 'vitest'

import { EMPTY_DRAFT, type ReportDraft } from './draft'
import {
  PHOTO_SLOTS,
  canReachStep,
  collectPhotos,
  validateStep,
  type StepState,
} from './steps'

const photo = (name: string) =>
  new File([new Uint8Array([1, 2, 3])], name, { type: 'image/jpeg' })

function state(draft: Partial<ReportDraft> = {}, withPhotos = false): StepState {
  return {
    draft: { ...EMPTY_DRAFT, ...draft },
    photos: withPhotos
      ? Object.fromEntries(PHOTO_SLOTS.map((slot) => [slot, photo(`${slot}.jpg`)]))
      : {},
    extraPhotos: [],
  }
}

const validVehicle = {
  vehicleId: 3,
  occurredAt: '2026-07-28T10:00',
  injuryFlag: false,
}
/** A governorate pick: coordinates plus the written address it requires. */
const validLocation = {
  lat: 33.5138,
  lng: 36.2765,
  regionCode: 'damascus',
  locationDescription: 'أوتوستراد المزة، مقابل مشفى الشامي',
}

describe('validateStep', () => {
  it('requires a vehicle, a time, and an injuries answer', () => {
    expect(validateStep('vehicle', state())).toBe('report.errors.vehicleRequired')
    expect(validateStep('vehicle', state({ vehicleId: 3 }))).toBe(
      'report.errors.occurredAtRequired',
    )
    expect(
      validateStep('vehicle', state({ vehicleId: 3, occurredAt: '2026-07-28T10:00' })),
    ).toBe('report.errors.injuryRequired')
    expect(validateStep('vehicle', state(validVehicle))).toBeNull()
  })

  it('rejects an accident time in the future', () => {
    // `datetime-local` values are local time, so the fixture has to be built in
    // local time too — a UTC string would read as the past east of Greenwich.
    const later = new Date(Date.now() + 2 * 60 * 60 * 1000)
    const future = new Date(later.getTime() - later.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16)

    expect(
      validateStep('vehicle', state({ ...validVehicle, occurredAt: future })),
    ).toBe('report.errors.occurredAtFuture')
  })

  it('requires coordinates inside the valid range', () => {
    expect(validateStep('location', state())).toBe('report.errors.locationRequired')
    expect(validateStep('location', state({ lat: 120, lng: 36 }))).toBe(
      'report.errors.latRange',
    )
    expect(validateStep('location', state({ lat: 33, lng: 200 }))).toBe(
      'report.errors.lngRange',
    )
    expect(validateStep('location', state(validLocation))).toBeNull()
  })

  it('demands a written address when the fix did not come from the device', () => {
    // Governorate coordinates are city-scale; the same rule runs server-side
    // in StoreCaseRequest, so the two must agree.
    expect(
      validateStep(
        'location',
        state({ lat: 33.5138, lng: 36.2765, locationVerified: false }),
      ),
    ).toBe('report.errors.locationDescriptionRequired')

    expect(
      validateStep(
        'location',
        state({ lat: 33.5138, lng: 36.2765, locationVerified: false, locationDescription: '   ' }),
      ),
    ).toBe('report.errors.locationDescriptionRequired')
  })

  it('accepts a device fix with no written address', () => {
    expect(
      validateStep(
        'location',
        state({ lat: 33.5138, lng: 36.2765, locationVerified: true }),
      ),
    ).toBeNull()
  })

  it('requires all four guided photos', () => {
    expect(validateStep('photos', state())).toBe('report.errors.photosRequired')
    expect(validateStep('photos', state({}, true))).toBeNull()
  })

  it('requires a counterparty phone unless it was a hit and run', () => {
    expect(validateStep('counterparty', state())).toBe(
      'report.errors.counterpartyPhoneRequired',
    )
    expect(validateStep('counterparty', state({ counterpartyPhone: '12345' }))).toBe(
      'report.errors.counterpartyPhoneRequired',
    )
    expect(
      validateStep('counterparty', state({ counterpartyPhone: '0955555555' })),
    ).toBeNull()
    // Hit and run has no counterparty to record — the backend drops the rule too.
    expect(validateStep('counterparty', state({ hitAndRun: true }))).toBeNull()
  })

  it('requires a non-blank statement within the 2000-character limit', () => {
    expect(validateStep('statement', state())).toBe(
      'report.errors.statementRequired',
    )
    expect(validateStep('statement', state({ statement: '   ' }))).toBe(
      'report.errors.statementRequired',
    )
    expect(validateStep('statement', state({ statement: 'x'.repeat(2001) }))).toBe(
      'report.errors.statementTooLong',
    )
    expect(validateStep('statement', state({ statement: 'وقع التصادم.' }))).toBeNull()
  })
})

describe('collectPhotos', () => {
  it('orders the guided slots first, then extras', () => {
    const extra = photo('extra.jpg')
    const collected = collectPhotos({ ...state({}, true), extraPhotos: [extra] })

    expect(collected).toHaveLength(PHOTO_SLOTS.length + 1)
    expect(collected.map((file) => file.name)).toEqual([
      ...PHOTO_SLOTS.map((slot) => `${slot}.jpg`),
      'extra.jpg',
    ])
  })

  it('satisfies the API minimum once every slot is filled', () => {
    expect(collectPhotos(state({}, true)).length).toBeGreaterThanOrEqual(4)
  })
})

describe('canReachStep', () => {
  it('blocks a later step while an earlier one is incomplete', () => {
    expect(canReachStep('photos', state(validVehicle))).toBe(false)
  })

  it('allows a step once everything before it passes', () => {
    expect(
      canReachStep('photos', state({ ...validVehicle, ...validLocation })),
    ).toBe(true)
  })

  it('always allows the first step', () => {
    expect(canReachStep('vehicle', state())).toBe(true)
  })
})
