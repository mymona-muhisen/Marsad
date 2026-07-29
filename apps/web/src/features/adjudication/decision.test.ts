import { describe, expect, it } from 'vitest'

import type { LiabilityRule } from '@/lib/api/types'
import {
  checkDecision,
  isOverride,
  proposalFor,
  totalPercentage,
} from './decision'

const rearEnd: LiabilityRule = {
  id: 1,
  scenario_code: 'REAR_END',
  description_ar: 'اصطدام خلفي.',
  fault_split_a: 100,
  fault_split_b: 0,
  version: 1,
  effective_from: '2026-01-01',
}

const shared: LiabilityRule = { ...rearEnd, id: 2, fault_split_a: 75, fault_split_b: 25 }

describe('totalPercentage', () => {
  it('sums the split', () => {
    expect(
      totalPercentage([
        { party_id: 1, percentage: 75 },
        { party_id: 2, percentage: 25 },
      ]),
    ).toBe(100)
  })

  it('treats an empty form as zero rather than NaN', () => {
    expect(totalPercentage([])).toBe(0)
  })
})

describe('isOverride', () => {
  it('is false when the split matches the rule in either order', () => {
    // FaultDecisionService::matchesRuleSplit sorts both sides, so the rule does
    // not dictate which party carries which share.
    expect(
      isOverride(rearEnd, [
        { party_id: 1, percentage: 0 },
        { party_id: 2, percentage: 100 },
      ]),
    ).toBe(false)

    expect(
      isOverride(rearEnd, [
        { party_id: 1, percentage: 100 },
        { party_id: 2, percentage: 0 },
      ]),
    ).toBe(false)
  })

  it('is true when the reviewer changes the numbers', () => {
    expect(
      isOverride(rearEnd, [
        { party_id: 1, percentage: 30 },
        { party_id: 2, percentage: 70 },
      ]),
    ).toBe(true)
  })

  it('is true for a manual decision with no rule', () => {
    expect(
      isOverride(null, [
        { party_id: 1, percentage: 50 },
        { party_id: 2, percentage: 50 },
      ]),
    ).toBe(true)
  })

  it('is true when the party count does not match the rule split', () => {
    expect(isOverride(rearEnd, [{ party_id: 1, percentage: 100 }])).toBe(true)
  })
})

describe('checkDecision', () => {
  const evenSplit = [
    { party_id: 1, percentage: 50 },
    { party_id: 2, percentage: 50 },
  ]

  it('blocks a split that does not total 100', () => {
    expect(
      checkDecision(
        rearEnd,
        [
          { party_id: 1, percentage: 60 },
          { party_id: 2, percentage: 30 },
        ],
        'مبرر كافٍ',
      ),
      // The total is checked before the justification, so this fails on total.
    ).toEqual({ ok: false, reason: 'total' })
  })

  it('blocks an override with no justification', () => {
    expect(checkDecision(rearEnd, evenSplit, '   ')).toEqual({
      ok: false,
      reason: 'justification',
    })
  })

  it('allows an override once justified', () => {
    expect(
      checkDecision(rearEnd, evenSplit, 'الأدلة تُظهر مسؤولية مشتركة.'),
    ).toEqual({ ok: true })
  })

  it('allows following the rule with no justification', () => {
    expect(
      checkDecision(
        shared,
        [
          { party_id: 1, percentage: 25 },
          { party_id: 2, percentage: 75 },
        ],
        '',
      ),
    ).toEqual({ ok: true })
  })

  it('always demands a justification for a manual decision', () => {
    expect(checkDecision(null, evenSplit, '')).toEqual({
      ok: false,
      reason: 'justification',
    })
  })
})

describe('proposalFor', () => {
  it('seeds a split that the rule accepts', () => {
    const allocations = proposalFor(shared, [11, 12])

    expect(totalPercentage(allocations)).toBe(100)
    expect(isOverride(shared, allocations)).toBe(false)
  })

  it('puts the larger share on the counterparty by convention', () => {
    // The reviewer swaps it when the evidence says otherwise.
    expect(proposalFor(rearEnd, [11, 12])).toEqual([
      { party_id: 11, percentage: 0 },
      { party_id: 12, percentage: 100 },
    ])
  })
})
