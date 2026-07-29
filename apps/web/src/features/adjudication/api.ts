import { apiFetch } from '@/lib/api/client'
import type {
  AccidentCase,
  FaultDecision,
  LiabilityRule,
  Paginated,
} from '@/lib/api/types'

export function fetchQueue(): Promise<Paginated<AccidentCase>> {
  return apiFetch<Paginated<AccidentCase>>('adjudication/queue', {
    query: { per_page: 50 },
  })
}

export function fetchLiabilityRules(): Promise<{ data: LiabilityRule[] }> {
  return apiFetch<{ data: LiabilityRule[] }>('liability-rules')
}

export type DecideInput = {
  caseNo: string
  /** Null means a manual split with no matrix rule behind it. */
  scenarioCode: string | null
  allocations: { party_id: number; percentage: number }[]
  justification: string
}

export function submitDecision(
  input: DecideInput,
): Promise<{ data: FaultDecision }> {
  return apiFetch<{ data: FaultDecision }>(
    `adjudication/cases/${encodeURIComponent(input.caseNo)}/decide`,
    {
      method: 'POST',
      body: {
        scenario_code: input.scenarioCode,
        allocations: input.allocations,
        justification: input.justification || null,
      },
    },
  )
}

export const queueQueryKey = ['adjudication', 'queue'] as const
export const liabilityRulesQueryKey = ['liability-rules'] as const
