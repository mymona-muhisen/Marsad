/**
 * Client-generated UUIDs for the offline-tolerance contract.
 *
 * A key must be minted once and then survive everything — a reload, a failed
 * submit, a retry twenty minutes later — because its whole purpose is to let
 * the server recognise the second attempt as the same attempt. Generating a
 * fresh one per submit would be worse than sending none at all: it would look
 * like idempotency while providing none.
 */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // Older WebViews lack randomUUID. getRandomValues is far more widely
  // available, so fall back to it before resorting to Math.random.
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    // RFC 4122 version 4 / variant bits.
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  // The API validates `uuid`, so the shape has to hold even here.
  const random = () => Math.floor(Math.random() * 16).toString(16)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) =>
    char === 'x' ? random() : ((Math.floor(Math.random() * 4) + 8) % 16).toString(16),
  )
}

/** Matches the API's `uuid` rule, so a corrupted stored key is discarded. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isIdempotencyKey(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}
