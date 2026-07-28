import { apiFetchResource } from '@/lib/api/client'
import type { ReportVerification } from '@/lib/api/types'

/**
 * UC-07 public authenticity check. Unauthenticated by design — the QR token is
 * the only credential, and the response carries validity metadata only.
 */
export function verifyReport(qrToken: string): Promise<ReportVerification> {
  return apiFetchResource<ReportVerification>(
    `reports/verify/${encodeURIComponent(qrToken)}`,
    { anonymous: true },
  )
}
