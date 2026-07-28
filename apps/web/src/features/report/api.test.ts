import { describe, expect, it } from 'vitest'

import { buildCaseFormData, type CreateCaseInput } from './api'

const photo = (name: string) =>
  new File([new Uint8Array([1, 2, 3])], name, { type: 'image/jpeg' })

const base: CreateCaseInput = {
  vehicleId: 7,
  occurredAt: '2026-07-28T11:00:00.000Z',
  lat: 33.5138,
  lng: 36.2765,
  locationVerified: true,
  injuryFlag: false,
  statement: 'اصطدمت بي المركبة من الخلف.',
  photos: [photo('a.jpg'), photo('b.jpg'), photo('c.jpg'), photo('d.jpg')],
  hitAndRun: false,
  counterpartyPhone: '0955555555',
}

describe('buildCaseFormData', () => {
  it('encodes booleans as 1/0, which is what Laravel’s boolean rule accepts', () => {
    const form = buildCaseFormData({ ...base, locationVerified: true, injuryFlag: false })

    expect(form.get('location_verified')).toBe('1')
    expect(form.get('injury_flag')).toBe('0')
    expect(form.get('hit_and_run')).toBe('0')
  })

  it('appends every photo under the photos[] array key', () => {
    const form = buildCaseFormData(base)

    expect(form.getAll('photos[]')).toHaveLength(4)
    expect((form.getAll('photos[]')[0] as File).name).toBe('a.jpg')
  })

  it('sends the scalar fields the FormRequest requires', () => {
    const form = buildCaseFormData(base)

    expect(form.get('vehicle_id')).toBe('7')
    expect(form.get('occurred_at')).toBe('2026-07-28T11:00:00.000Z')
    expect(form.get('lat')).toBe('33.5138')
    expect(form.get('lng')).toBe('36.2765')
    expect(form.get('statement')).toBe(base.statement)
  })

  it('omits counterparty fields rather than sending empty strings', () => {
    // An empty string would fail the backend's phone regex; absent is valid
    // for a hit and run.
    const form = buildCaseFormData({
      ...base,
      hitAndRun: true,
      counterpartyPhone: undefined,
      counterpartyPlate: undefined,
    })

    expect(form.has('counterparty_phone')).toBe(false)
    expect(form.has('counterparty_plate')).toBe(false)
    expect(form.get('hit_and_run')).toBe('1')
  })

  it('includes the counterparty plate when one was given', () => {
    const form = buildCaseFormData({ ...base, counterpartyPlate: 'ABC-1234' })

    expect(form.get('counterparty_plate')).toBe('ABC-1234')
  })
})
