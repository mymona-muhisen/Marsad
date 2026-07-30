import { apiFetch, apiFetchResource } from '@/lib/api/client'
import type { AccidentCase, CaseJoinTeaser } from '@/lib/api/types'

/**
 * The public preview behind the SMS deep link. Unauthenticated and
 * rate-limited; it deliberately returns only case_no, occurred_at and region —
 * never the reporter's statement, so the counterparty cannot anchor their own
 * account to it (UC-02 step 3).
 */
export function fetchJoinTeaser(token: string): Promise<CaseJoinTeaser> {
  return apiFetchResource<CaseJoinTeaser>(
    `cases/join/${encodeURIComponent(token)}`,
  )
}

export type JoinInput = {
  token: string
  statement: string
  photos: File[]
}

export function buildJoinFormData(input: JoinInput): FormData {
  const form = new FormData()

  form.set('statement', input.statement)

  for (const photo of input.photos) {
    form.append('photos[]', photo, photo.name)
  }

  return form
}

export function submitJoin(input: JoinInput): Promise<{ data: AccidentCase }> {
  return apiFetch<{ data: AccidentCase }>(
    `cases/join/${encodeURIComponent(input.token)}`,
    { method: 'POST', body: buildJoinFormData(input) },
  )
}

export function joinTeaserQueryKey(token: string) {
  return ['cases', 'join', token] as const
}
