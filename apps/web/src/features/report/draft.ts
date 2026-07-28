const DRAFT_KEY = 'masar.report.draft'

/**
 * The wizard's text fields. Photos live in IndexedDB instead — see
 * `photo-store.ts` for why.
 *
 * `occurred_at` is held as the raw `datetime-local` string the input produces
 * ("2026-07-28T14:30") and converted to ISO only at submit time, so a reloaded
 * draft repopulates the input exactly as the user left it.
 */
export type ReportDraft = {
  vehicleId: number | null
  occurredAt: string
  injuryFlag: boolean | null
  lat: number | null
  lng: number | null
  locationVerified: boolean
  hitAndRun: boolean
  counterpartyPhone: string
  counterpartyPlate: string
  statement: string
  /** Furthest step reached, so a reload resumes where the user stopped. */
  step: number
}

export const EMPTY_DRAFT: ReportDraft = {
  vehicleId: null,
  occurredAt: '',
  injuryFlag: null,
  lat: null,
  lng: null,
  locationVerified: false,
  hitAndRun: false,
  counterpartyPhone: '',
  counterpartyPlate: '',
  statement: '',
  step: 0,
}

function isDraftShaped(value: unknown): value is Partial<ReportDraft> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Merges whatever survived into a complete draft. A stored draft written by an
 * older build must never leave the wizard holding undefined fields, so unknown
 * or missing keys fall back to the empty draft's values.
 */
export function loadDraft(): ReportDraft {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return { ...EMPTY_DRAFT }

    const parsed: unknown = JSON.parse(raw)
    if (!isDraftShaped(parsed)) return { ...EMPTY_DRAFT }

    return {
      ...EMPTY_DRAFT,
      ...Object.fromEntries(
        Object.entries(parsed).filter(([key, value]) => {
          if (!(key in EMPTY_DRAFT)) return false
          const expected = EMPTY_DRAFT[key as keyof ReportDraft]
          // null is a legitimate stored value for the nullable fields.
          return value === null || typeof value === typeof expected || expected === null
        }),
      ),
    }
  } catch {
    return { ...EMPTY_DRAFT }
  }
}

export function saveDraft(draft: ReportDraft): void {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // Quota or private mode — the wizard keeps working from memory.
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY)
  } catch {
    // Already unreachable.
  }
}

export function hasDraft(): boolean {
  try {
    return window.localStorage.getItem(DRAFT_KEY) !== null
  } catch {
    return false
  }
}
