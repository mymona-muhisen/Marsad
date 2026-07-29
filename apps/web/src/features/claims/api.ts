import { apiFetch, apiFetchResource } from '@/lib/api/client'
import type { Claim, Paginated } from '@/lib/api/types'

export function fetchClaims(): Promise<Paginated<Claim>> {
  return apiFetch<Paginated<Claim>>('claims', { query: { per_page: 50 } })
}

export function fetchClaim(id: number): Promise<Claim> {
  return apiFetchResource<Claim>(`claims/${id}`)
}

export const claimsQueryKey = ['claims'] as const

export function claimQueryKey(id: number) {
  return ['claims', id] as const
}
