import { describe, expect, it } from 'vitest'

import { REGIONS, findRegion, regionLabel } from './regions'

/**
 * `region.ar` is written verbatim into `accident_cases.region`, which the
 * backend matches against `users.zone` for surveyor dispatch (FR-C5) and groups
 * on for black-spot analytics.
 *
 * The match is plain string equality with a silent fallback to any free
 * surveyor, so a vocabulary drift disables zone routing without failing
 * anything — which is exactly what happened between Sprints 9 and 11. This list
 * is pinned here and in `apps/api/config/regions.php`; the API side asserts its
 * pilot zones are a subset of it.
 */
const GOVERNORATES_PINNED_TO_API = [
  'دمشق',
  'ريف دمشق',
  'حلب',
  'حمص',
  'حماة',
  'اللاذقية',
  'طرطوس',
  'إدلب',
  'دير الزور',
  'الرقة',
  'الحسكة',
  'درعا',
  'السويداء',
  'القنيطرة',
]

describe('regions', () => {
  it('matches the governorate vocabulary the API config declares', () => {
    expect(REGIONS.map((region) => region.ar)).toEqual(
      GOVERNORATES_PINNED_TO_API,
    )
  })

  it('covers all 14 governorates with unique codes', () => {
    expect(REGIONS).toHaveLength(14)
    expect(new Set(REGIONS.map((r) => r.code)).size).toBe(14)
  })

  it('gives every region usable coordinates', () => {
    for (const region of REGIONS) {
      // Syria's bounding box, roughly — a transposed lat/lng would escape it.
      expect(region.lat).toBeGreaterThan(32)
      expect(region.lat).toBeLessThan(38)
      expect(region.lng).toBeGreaterThan(35)
      expect(region.lng).toBeLessThan(43)
    }
  })

  it('looks a region up by code and labels it per locale', () => {
    const damascus = findRegion('damascus')

    expect(damascus).toBeDefined()
    expect(regionLabel(damascus!, 'ar')).toBe('دمشق')
    expect(regionLabel(damascus!, 'en')).toBe('Damascus')
  })

  it('returns undefined for an unknown code', () => {
    expect(findRegion('atlantis')).toBeUndefined()
  })
})
