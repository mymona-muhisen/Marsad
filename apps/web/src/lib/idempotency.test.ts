import { describe, expect, it } from 'vitest'

import { isIdempotencyKey, newIdempotencyKey } from './idempotency'

describe('idempotency keys', () => {
  it('mints a v4 UUID the API will accept', () => {
    // The FormRequest validates `uuid`; a malformed key is a 422, not a retry.
    expect(isIdempotencyKey(newIdempotencyKey())).toBe(true)
  })

  it('never repeats', () => {
    const keys = new Set(Array.from({ length: 500 }, newIdempotencyKey))

    expect(keys.size).toBe(500)
  })

  it('rejects anything that is not a well-formed key', () => {
    for (const value of ['', 'not-a-uuid', null, undefined, 42, {}]) {
      expect(isIdempotencyKey(value)).toBe(false)
    }
  })

  it('rejects a v1 UUID, since the API pins the shape', () => {
    expect(isIdempotencyKey('00000000-0000-0000-0000-000000000000')).toBe(false)
  })
})
