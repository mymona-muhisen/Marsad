import type { Role } from '@/lib/roles'

/** Mirrors `App\Http\Resources\UserResource`. */
export type User = {
  id: number
  full_name: string | null
  phone: string
  locale: string
  status: string
  organization_id: number | null
  roles: Role[]
}

/** `POST /auth/otp/verify` — note the user is NOT wrapped in `data` here. */
export type OtpVerifyResponse = {
  user: User
  token: string
}

export type MessageResponse = {
  message: string
}

/**
 * Mirrors `App\Http\Resources\ReportVerifyResource` (UC-07). Deliberately
 * carries no names, plates, or amounts — validity metadata only.
 */
export type ReportVerification = {
  report_no: string
  issued_at: string
  status: 'active' | 'superseded'
  superseded_by: string | null
}

/** Mirrors `App\Http\Resources\CaseJoinTeaserResource` (UC-02 step 3). */
export type CaseJoinTeaser = {
  case_no: string
  occurred_at: string
  region: string | null
}
