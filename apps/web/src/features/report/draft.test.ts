import { afterEach, describe, expect, it } from 'vitest'

import {
  EMPTY_DRAFT,
  clearDraft,
  hasDraft,
  loadDraft,
  saveDraft,
  type ReportDraft,
} from './draft'

const KEY = 'marsad.report.draft'

/**
 * A loaded draft always carries a freshly-minted idempotency key, so it never
 * equals EMPTY_DRAFT verbatim. Compare everything else, and assert the key
 * separately where it matters.
 */
const withoutKey = (draft: ReportDraft) => {
  const rest: Partial<ReportDraft> = { ...draft }
  delete rest.idempotencyKey
  return rest
}

afterEach(() => window.localStorage.clear())

describe('report draft', () => {
  it('round-trips a filled draft', () => {
    const draft = {
      ...EMPTY_DRAFT,
      vehicleId: 7,
      occurredAt: '2026-07-28T14:30',
      injuryFlag: false,
      lat: 33.5138,
      lng: 36.2765,
      locationVerified: true,
      counterpartyPhone: '0955555555',
      statement: 'اصطدمت بي المركبة من الخلف.',
      step: 3,
    }

    saveDraft(draft)

    expect(withoutKey(loadDraft())).toEqual(withoutKey(draft))
    expect(hasDraft()).toBe(true)
  })

  it('round-trips the idempotency key, which is the retry contract', () => {
    const key = '11111111-1111-4111-8111-111111111111'
    saveDraft({ ...EMPTY_DRAFT, idempotencyKey: key })

    // A reload after a crash has to resubmit under the original key, or the
    // server sees a brand-new report and files the accident twice.
    expect(loadDraft().idempotencyKey).toBe(key)
  })

  it('returns an empty draft when nothing is stored', () => {
    expect(withoutKey(loadDraft())).toEqual(withoutKey(EMPTY_DRAFT))
    expect(hasDraft()).toBe(false)
  })

  it('survives a corrupted entry instead of crashing the wizard', () => {
    window.localStorage.setItem(KEY, '{not json')

    expect(withoutKey(loadDraft())).toEqual(withoutKey(EMPTY_DRAFT))
  })

  it('ignores a stored array', () => {
    window.localStorage.setItem(KEY, '[1,2,3]')

    expect(withoutKey(loadDraft())).toEqual(withoutKey(EMPTY_DRAFT))
  })

  it('fills gaps left by a draft written by an older build', () => {
    // Only two of the fields the current build expects.
    window.localStorage.setItem(KEY, JSON.stringify({ vehicleId: 3, step: 1 }))

    const loaded = loadDraft()

    expect(loaded.vehicleId).toBe(3)
    expect(loaded.step).toBe(1)
    expect(loaded.statement).toBe('')
    expect(loaded.hitAndRun).toBe(false)
    expect(loaded.injuryFlag).toBeNull()
  })

  it('drops keys the current build does not know', () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ vehicleId: 3, legacyField: 'gone' }),
    )

    expect(loadDraft()).not.toHaveProperty('legacyField')
  })

  it('rejects a field stored with the wrong type', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ statement: 42 }))

    expect(loadDraft().statement).toBe('')
  })

  it('clears everything on discard', () => {
    saveDraft({ ...EMPTY_DRAFT, statement: 'x' })
    clearDraft()

    expect(hasDraft()).toBe(false)
    expect(withoutKey(loadDraft())).toEqual(withoutKey(EMPTY_DRAFT))
  })
})
