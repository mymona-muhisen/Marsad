import { apiFetch } from '@/lib/api/client'
import type { Dispatch, Paginated } from '@/lib/api/types'

export function fetchDispatches(): Promise<Paginated<Dispatch>> {
  return apiFetch<Paginated<Dispatch>>('surveyor/dispatches', {
    query: { per_page: 50 },
  })
}

export function acceptDispatch(id: number): Promise<{ data: Dispatch }> {
  return apiFetch<{ data: Dispatch }>(`surveyor/dispatches/${id}/accept`, {
    method: 'POST',
  })
}

export function declineDispatch(input: {
  id: number
  reason: string
}): Promise<{ data: Dispatch }> {
  return apiFetch<{ data: Dispatch }>(
    `surveyor/dispatches/${input.id}/decline`,
    // A reason is mandatory: declining reassigns the case to the next
    // surveyor, and the chain is kept as rows rather than overwritten.
    { method: 'POST', body: { reason: input.reason } },
  )
}

export function markOnScene(id: number): Promise<{ data: Dispatch }> {
  return apiFetch<{ data: Dispatch }>(`surveyor/dispatches/${id}/on-scene`, {
    method: 'POST',
  })
}

export type CompleteInput = {
  id: number
  photos: File[]
  /** Required here, one per photo — see buildCompleteFormData. */
  photoKeys: string[]
}

export function buildCompleteFormData(input: CompleteInput): FormData {
  const form = new FormData()

  for (const photo of input.photos) {
    form.append('photos[]', photo, photo.name)
  }

  /*
   * `photo_keys` — note the field name differs from the citizen endpoints'
   * `idempotency_keys`. CompleteDispatchRequest also makes it *required* with
   * `size:count(photos)`, so unlike the citizen paths this is not optional:
   * a surveyor uploading from a patchy roadside connection is exactly the
   * case the contract was written for.
   */
  for (const key of input.photoKeys) {
    form.append('photo_keys[]', key)
  }

  return form
}

export function completeDispatch(
  input: CompleteInput,
): Promise<{ data: Dispatch }> {
  return apiFetch<{ data: Dispatch }>(
    `surveyor/dispatches/${input.id}/complete`,
    { method: 'POST', body: buildCompleteFormData(input) },
  )
}

export const dispatchesQueryKey = ['surveyor', 'dispatches'] as const
