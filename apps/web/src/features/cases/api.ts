import { apiFetch, apiFetchResource } from '@/lib/api/client'
import type { AccidentCase, Objection, Paginated } from '@/lib/api/types'

export function fetchCases(): Promise<Paginated<AccidentCase>> {
  return apiFetch<Paginated<AccidentCase>>('cases', { query: { per_page: 50 } })
}

/** Cases are addressed by `case_no` — the API exposes no sequential id. */
export function fetchCase(caseNo: string): Promise<AccidentCase> {
  return apiFetchResource<AccidentCase>(`cases/${encodeURIComponent(caseNo)}`)
}

export function submitObjection(input: {
  caseNo: string
  reason: string
}): Promise<{ data: Objection }> {
  return apiFetch<{ data: Objection }>(
    `cases/${encodeURIComponent(input.caseNo)}/objections`,
    { method: 'POST', body: { reason: input.reason } },
  )
}

/**
 * Evidence media is never served from a permanent path. This exchanges an
 * authenticated request for a 30-minute signed link, which the gallery then
 * loads directly.
 */
export function fetchEvidenceUrl(evidenceId: number): Promise<string> {
  return apiFetchResource<{ url: string; expires_in_minutes: number }>(
    `evidence/${evidenceId}/download-url`,
  ).then((payload) => payload.url)
}

export const casesQueryKey = ['cases'] as const

export function caseQueryKey(caseNo: string) {
  return ['cases', caseNo] as const
}
