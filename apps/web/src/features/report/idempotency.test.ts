import { beforeEach, describe, expect, it } from 'vitest'

import { isIdempotencyKey } from '@/lib/idempotency'
import { EMPTY_DRAFT, loadDraft, saveDraft } from './draft'
import { buildCaseFormData } from './api'
import { collectPhotoKeys, collectPhotos, type StepState } from './steps'

const photo = (name: string) => new File(['x'], name, { type: 'image/jpeg' })

beforeEach(() => {
  window.localStorage.clear()
})

describe('the case-level key', () => {
  it('is minted for a fresh draft', () => {
    expect(isIdempotencyKey(loadDraft().idempotencyKey)).toBe(true)
  })

  it('survives a reload — otherwise it protects nothing', () => {
    const first = loadDraft()
    saveDraft(first)

    // The whole point: the retry after a crash carries the original key.
    expect(loadDraft().idempotencyKey).toBe(first.idempotencyKey)
  })

  it('is re-minted when the stored one is corrupted', () => {
    saveDraft({ ...EMPTY_DRAFT, idempotencyKey: 'not-a-uuid' })

    // A malformed key would be rejected by the API as a 422 on every attempt.
    expect(isIdempotencyKey(loadDraft().idempotencyKey)).toBe(true)
  })

  it('differs between two separate reports', () => {
    const first = loadDraft().idempotencyKey
    window.localStorage.clear()

    // A second accident must not be swallowed as a replay of the first.
    expect(loadDraft().idempotencyKey).not.toBe(first)
  })
})

describe('photo keys', () => {
  const state = (overrides: Partial<StepState> = {}): StepState => ({
    draft: { ...EMPTY_DRAFT },
    photos: {
      wide: photo('wide.jpg'),
      vehicles: photo('vehicles.jpg'),
      damage: photo('damage.jpg'),
      plate: photo('plate.jpg'),
    },
    extraPhotos: [],
    ...overrides,
  })

  const keys = {
    wide: '11111111-1111-4111-8111-111111111111',
    vehicles: '22222222-2222-4222-8222-222222222222',
    damage: '33333333-3333-4333-8333-333333333333',
    plate: '44444444-4444-4444-8444-444444444444',
  }

  it('lines up index-for-index with the photos', () => {
    const current = state()

    expect(collectPhotoKeys(current, keys, [])).toHaveLength(
      collectPhotos(current).length,
    )
  })

  it('drops the key of a slot with no photo, keeping alignment', () => {
    const current = state({
      photos: { wide: photo('wide.jpg'), damage: photo('damage.jpg') },
    })

    // A key attached to the wrong file is worse than none at all.
    expect(collectPhotoKeys(current, keys, [])).toEqual([
      keys.wide,
      keys.damage,
    ])
  })

  it('appends extra-photo keys after the guided slots', () => {
    const extraKey = '55555555-5555-4555-8555-555555555555'
    const current = state({ extraPhotos: [photo('extra.jpg')] })

    expect(collectPhotoKeys(current, keys, [extraKey])).toEqual([
      keys.wide,
      keys.vehicles,
      keys.damage,
      keys.plate,
      extraKey,
    ])
  })
})

describe('the submitted payload', () => {
  const input = {
    vehicleId: 7,
    occurredAt: '2026-07-20T09:30:00.000Z',
    lat: 33.5138,
    lng: 36.2765,
    locationVerified: false,
    injuryFlag: false,
    statement: 'اصطدمت بي المركبة من الخلف.',
    photos: [photo('a.jpg'), photo('b.jpg')],
    hitAndRun: false,
  }

  it('carries the case key and one key per photo', () => {
    const form = buildCaseFormData({
      ...input,
      idempotencyKey: '11111111-1111-4111-8111-111111111111',
      photoKeys: [
        '22222222-2222-4222-8222-222222222222',
        '33333333-3333-4333-8333-333333333333',
      ],
    })

    expect(form.get('idempotency_key')).toBe(
      '11111111-1111-4111-8111-111111111111',
    )
    expect(form.getAll('idempotency_keys[]')).toHaveLength(2)
  })

  it('sends no photo keys at all rather than a misaligned subset', () => {
    const form = buildCaseFormData({
      ...input,
      photoKeys: ['22222222-2222-4222-8222-222222222222'],
    })

    // One key for two photos would silently pair it with the wrong file.
    expect(form.getAll('idempotency_keys[]')).toEqual([])
  })

  it('omits the case key when there is none', () => {
    expect(buildCaseFormData(input).get('idempotency_key')).toBeNull()
  })
})
