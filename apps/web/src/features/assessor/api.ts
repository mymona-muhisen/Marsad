import { apiFetch, apiFetchResource } from '@/lib/api/client'
import type {
  Claim,
  DamageEstimate,
  Paginated,
  PartsPrice,
} from '@/lib/api/types'

export function fetchAssignedClaims(): Promise<Paginated<Claim>> {
  return apiFetch<Paginated<Claim>>('assessor/claims', {
    query: { per_page: 50 },
  })
}

export function fetchAssignedClaim(claimId: number): Promise<Claim> {
  return apiFetchResource<Claim>(`assessor/claims/${claimId}`)
}

/**
 * The reference list every line is measured against.
 *
 * `DamageEstimateService` flags any line deviating more than the configured
 * threshold from these figures, so the form loads them to warn *before*
 * submitting rather than letting the assessor discover it afterwards.
 */
export function fetchPartsPrices(): Promise<{ data: PartsPrice[] }> {
  return apiFetch<{ data: PartsPrice[] }>('assessor/parts-prices')
}

export type EstimateLineInput = {
  description: string
  part_code: string | null
  qty: number
  unit_price: number
  labor_hours: number | null
}

export function submitEstimate(input: {
  claimId: number
  type: 'assessor' | 'workshop' | 'desk'
  items: EstimateLineInput[]
}): Promise<{ data: DamageEstimate }> {
  return apiFetch<{ data: DamageEstimate }>(
    `claims/${input.claimId}/estimates`,
    {
      method: 'POST',
      body: {
        type: input.type,
        // No total is sent: doc 04 G10 has the server recompute it from the
        // items, so a client-side figure could only ever disagree.
        items: input.items.map((item) => ({
          description: item.description,
          part_code: item.part_code || null,
          qty: item.qty,
          unit_price: item.unit_price,
          labor_hours: item.labor_hours,
        })),
      },
    },
  )
}

export const assignedClaimsQueryKey = ['assessor', 'claims'] as const
export const partsPricesQueryKey = ['assessor', 'parts-prices'] as const

export function assignedClaimQueryKey(claimId: number) {
  return ['assessor', 'claims', claimId] as const
}
