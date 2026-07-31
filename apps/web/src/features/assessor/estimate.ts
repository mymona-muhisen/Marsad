import type { PartsPrice } from '@/lib/api/types'

export type EstimateLine = {
  description: string
  partCode: string
  qty: string
  unitPrice: string
  laborHours: string
}

export const emptyLine = (): EstimateLine => ({
  description: '',
  partCode: '',
  qty: '1',
  unitPrice: '',
  laborHours: '',
})

/**
 * Must match `config('claims.deviation_threshold_percent')`.
 *
 * Duplicated across the language boundary like the adjudicator's override rule:
 * the server decides, but a form that only reveals the flag *after* submitting
 * teaches the assessor nothing.
 */
export const DEVIATION_THRESHOLD_PERCENT = 15

export function lineTotal(line: EstimateLine): number {
  const qty = Number(line.qty)
  const price = Number(line.unitPrice)

  if (!Number.isFinite(qty) || !Number.isFinite(price)) return 0

  return qty * price
}

export function estimateTotal(lines: EstimateLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0)
}

/**
 * How far a line's unit price sits from its reference, or null when there is
 * nothing to compare against.
 *
 * Mirrors `DamageEstimateService::exceedsDeviationThreshold()`: absolute
 * difference over the reference, and a non-positive reference compares to
 * nothing rather than dividing by zero.
 */
export function deviationPercent(
  line: EstimateLine,
  prices: PartsPrice[],
): number | null {
  if (!line.partCode) return null

  const reference = prices.find((price) => price.part_code === line.partCode)
  if (!reference) return null

  const referencePrice = Number(reference.reference_price)
  const unitPrice = Number(line.unitPrice)

  if (!Number.isFinite(unitPrice) || !Number.isFinite(referencePrice)) return null
  if (referencePrice <= 0) return null

  return (Math.abs(unitPrice - referencePrice) / referencePrice) * 100
}

export function isFlagged(line: EstimateLine, prices: PartsPrice[]): boolean {
  const deviation = deviationPercent(line, prices)

  return deviation !== null && deviation > DEVIATION_THRESHOLD_PERCENT
}

export type LineGate = { ok: true } | { ok: false; reason: 'empty' | 'line' }

/** The same shape the API validates: a description and a price per line. */
export function checkLines(lines: EstimateLine[]): LineGate {
  if (lines.length === 0) return { ok: false, reason: 'empty' }

  const incomplete = lines.some(
    (line) =>
      line.description.trim().length === 0 ||
      line.unitPrice.trim().length === 0 ||
      !Number.isFinite(Number(line.unitPrice)) ||
      Number(line.unitPrice) < 0 ||
      !Number.isFinite(Number(line.qty)) ||
      Number(line.qty) < 1,
  )

  return incomplete ? { ok: false, reason: 'line' } : { ok: true }
}
