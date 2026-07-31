import { describe, expect, it } from 'vitest'

import type { PartsPrice } from '@/lib/api/types'
import {
  checkLines,
  deviationPercent,
  emptyLine,
  estimateTotal,
  isFlagged,
  lineTotal,
  type EstimateLine,
} from './estimate'

const price = (overrides: Partial<PartsPrice> = {}): PartsPrice => ({
  id: 1,
  part_code: 'BUMPER_F',
  name_ar: 'مصد أمامي',
  reference_price: '100000.00',
  version: 1,
  effective_from: '2026-01-01',
  ...overrides,
})

const line = (overrides: Partial<EstimateLine> = {}): EstimateLine => ({
  ...emptyLine(),
  description: 'مصد أمامي',
  unitPrice: '100000',
  ...overrides,
})

describe('totals', () => {
  it('multiplies quantity by unit price', () => {
    expect(lineTotal(line({ qty: '3', unitPrice: '50000' }))).toBe(150000)
  })

  it('treats a half-typed line as zero rather than NaN', () => {
    expect(lineTotal(line({ unitPrice: '' }))).toBe(0)
    expect(estimateTotal([line({ unitPrice: 'abc' })])).toBe(0)
  })

  it('sums every line', () => {
    expect(
      estimateTotal([
        line({ qty: '2', unitPrice: '50000' }),
        line({ qty: '1', unitPrice: '20000' }),
      ]),
    ).toBe(120000)
  })
})

describe('deviation', () => {
  const prices = [price()]

  it('has nothing to compare when no part is chosen', () => {
    // A labour line has no reference, and the server flags it false.
    expect(deviationPercent(line({ partCode: '' }), prices)).toBeNull()
    expect(isFlagged(line({ partCode: '' }), prices)).toBe(false)
  })

  it('has nothing to compare when the part is not in the list', () => {
    expect(deviationPercent(line({ partCode: 'UNKNOWN' }), prices)).toBeNull()
  })

  it('measures the absolute distance from the reference', () => {
    expect(
      deviationPercent(
        line({ partCode: 'BUMPER_F', unitPrice: '120000' }),
        prices,
      ),
    ).toBeCloseTo(20)

    // Under-quoting deviates just as much as over-quoting — the server uses
    // abs(), and an implausibly cheap part is equally worth a look.
    expect(
      deviationPercent(
        line({ partCode: 'BUMPER_F', unitPrice: '80000' }),
        prices,
      ),
    ).toBeCloseTo(20)
  })

  it('does not flag a line inside the threshold', () => {
    expect(
      isFlagged(line({ partCode: 'BUMPER_F', unitPrice: '110000' }), prices),
    ).toBe(false)
  })

  it('flags a line past the threshold', () => {
    expect(
      isFlagged(line({ partCode: 'BUMPER_F', unitPrice: '200000' }), prices),
    ).toBe(true)
  })

  it('treats exactly the threshold as acceptable, matching the server', () => {
    // `> threshold`, not `>=` — DamageEstimateService::exceedsDeviationThreshold.
    expect(
      isFlagged(line({ partCode: 'BUMPER_F', unitPrice: '115000' }), prices),
    ).toBe(false)
  })

  it('compares against nothing when the reference is zero', () => {
    expect(
      deviationPercent(line({ partCode: 'BUMPER_F' }), [
        price({ reference_price: '0.00' }),
      ]),
    ).toBeNull()
  })
})

describe('the submit gate', () => {
  it('refuses an empty estimate', () => {
    expect(checkLines([])).toEqual({ ok: false, reason: 'empty' })
  })

  it('refuses a line with no description', () => {
    expect(checkLines([line({ description: '  ' })])).toEqual({
      ok: false,
      reason: 'line',
    })
  })

  it('refuses a line with no price', () => {
    expect(checkLines([line({ unitPrice: '' })])).toEqual({
      ok: false,
      reason: 'line',
    })
  })

  it('refuses a quantity below one', () => {
    expect(checkLines([line({ qty: '0' })])).toEqual({
      ok: false,
      reason: 'line',
    })
  })

  it('accepts a complete line', () => {
    expect(checkLines([line()])).toEqual({ ok: true })
  })

  it('accepts a zero price, which the API allows', () => {
    expect(checkLines([line({ unitPrice: '0' })])).toEqual({ ok: true })
  })
})
