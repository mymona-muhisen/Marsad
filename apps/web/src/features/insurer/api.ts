import { apiFetch, apiFetchResource } from '@/lib/api/client'
import type {
  Claim,
  ClaimDecisionOutcome,
  ClaimReasonCode,
  ClaimStatus,
  InsurancePolicy,
  Organization,
  Paginated,
  SettlementMode,
} from '@/lib/api/types'

export type ClaimFilters = {
  status?: ClaimStatus | ''
  slaBreached?: boolean
}

export function fetchInsurerClaims(
  filters: ClaimFilters = {},
): Promise<Paginated<Claim>> {
  return apiFetch<Paginated<Claim>>('insurer/claims', {
    query: {
      per_page: 50,
      // Omitted rather than sent empty: the API validates `status` against the
      // enum, and '' is not a member.
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.slaBreached ? { sla_breached: 1 } : {}),
    },
  })
}

export function fetchInsurerClaim(claimId: number): Promise<Claim> {
  return apiFetchResource<Claim>(`insurer/claims/${claimId}`)
}

export function fetchWorkshops(): Promise<{ data: Organization[] }> {
  return apiFetch<{ data: Organization[] }>('insurer/workshops')
}

export function fetchInsurerPolicies(
  status?: 'pending' | 'verified' | 'rejected',
): Promise<Paginated<InsurancePolicy>> {
  return apiFetch<Paginated<InsurancePolicy>>('insurer/policies', {
    query: { per_page: 50, ...(status ? { verification_status: status } : {}) },
  })
}

export function decideClaim(input: {
  claimId: number
  outcome: ClaimDecisionOutcome
  reasonCode: ClaimReasonCode
  note: string
}): Promise<{ data: Claim }> {
  return apiFetch<{ data: Claim }>(`insurer/claims/${input.claimId}/decide`, {
    method: 'POST',
    body: {
      outcome: input.outcome,
      // FR-CL2: a reason code is mandatory on every decision, never inferred.
      reason_code: input.reasonCode,
      note: input.note || null,
    },
  })
}

export function recordSettlement(input: {
  claimId: number
  mode: SettlementMode
  amount: number
  workshopOrgId: number | null
}): Promise<{ data: unknown }> {
  return apiFetch(`insurer/claims/${input.claimId}/settlement`, {
    method: 'POST',
    body: {
      mode: input.mode,
      amount: input.amount,
      workshop_org_id:
        input.mode === 'repair_order' ? input.workshopOrgId : null,
    },
  })
}

export function verifyPolicy(policyId: number): Promise<{ data: InsurancePolicy }> {
  return apiFetch<{ data: InsurancePolicy }>(
    `insurer/policies/${policyId}/verify`,
    { method: 'POST' },
  )
}

export function rejectPolicy(input: {
  policyId: number
  reason: string
}): Promise<{ data: InsurancePolicy }> {
  return apiFetch<{ data: InsurancePolicy }>(
    `insurer/policies/${input.policyId}/reject`,
    { method: 'POST', body: { reason: input.reason || null } },
  )
}

export const insurerClaimsQueryKey = ['insurer', 'claims'] as const
export const insurerPoliciesQueryKey = ['insurer', 'policies'] as const
export const workshopsQueryKey = ['insurer', 'workshops'] as const

export function insurerClaimQueryKey(claimId: number) {
  return ['insurer', 'claims', claimId] as const
}
