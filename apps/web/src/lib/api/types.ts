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

/** Laravel's paginated resource-collection envelope. */
export type Paginated<T> = {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

/** Mirrors `App\Http\Resources\VehicleResource`. */
export type Vehicle = {
  id: number
  plate_no: string
  vin: string | null
  make: string
  model: string
  year: number | null
  color: string | null
  deleted_at: string | null
  created_at: string
}

/** Mirrors `App\Enums\CaseStatus` — the 12-state lifecycle. */
export type CaseStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'awaiting_counterparty'
  | 'evidence_complete'
  | 'adjudication'
  | 'decision_issued'
  | 'objection_window'
  | 'final'
  | 'closed'
  | 'cancelled'
  | 'escalated'

/** Mirrors `App\Enums\CaseTrack` — the triage engine's verdict. */
export type CaseTrack = 'fast_track' | 'dispatch_required' | 'police_required'

/** Mirrors `App\Enums\ClaimStatus`. */
export type ClaimStatus =
  | 'opened'
  | 'info_requested'
  | 'assessing'
  | 'approved'
  | 'partially_approved'
  | 'rejected'
  | 'settled'
  | 'closed'

/** Mirrors `App\Http\Resources\ObjectionResource`. */
export type Objection = {
  id: number
  decision_id: number
  party_id: number
  reason: string
  status: 'open' | 'upheld' | 'rejected'
  resolution_note: string | null
  resolved_at: string | null
}

/** Mirrors `App\Http\Resources\FaultDecisionResource`. */
export type FaultDecision = {
  id: number
  case_id: number
  rule_id: number | null
  scenario_code?: string | null
  /** The cited rule in plain Arabic (FR-F2). */
  rule_description_ar?: string | null
  status: string
  was_overridden: boolean
  justification: string | null
  decided_at: string
  objection_window_hours: number
  objection_deadline: string
  /**
   * Server-computed. The countdown ticks down from this rather than diffing
   * the deadline against the device clock, which may be wrong.
   */
  objection_seconds_remaining: number
  allocations?: { party_id: number; percentage: number }[]
  objections?: Objection[]
}

export type CaseReportSummary = {
  report_no: string
  status: 'active' | 'superseded'
  issued_at: string
  qr_token: string
}

export type CaseClaimSummary = {
  id: number
  claimant_party_id: number
  status: ClaimStatus
  sla_due_at: string
  opened_at: string
}

/** Mirrors `App\Http\Resources\EvidenceItemResource`. */
export type EvidenceItem = {
  id: number
  party_id: number
  type: 'photo' | 'voice' | 'sketch' | 'document'
  file_path: string
  sha256: string
  lat: number | null
  lng: number | null
  captured_at: string | null
  superseded_by: number | null
}

/** Mirrors `App\Http\Resources\CasePartyResource`. */
export type CaseParty = {
  id: number
  role: string
  user_id: number | null
  vehicle_id: number | null
  policy_id: number | null
  unregistered_plate: string | null
  statement_text: string | null
  joined_at: string | null
  evidence?: EvidenceItem[]
}

/**
 * Mirrors `App\Http\Resources\CaseResource`. Note there is no sequential `id`
 * — public identity is `case_no` only (CLAUDE.md rule 10).
 */
export type AccidentCase = {
  case_no: string
  status: CaseStatus
  track: CaseTrack | null
  channel: string
  occurred_at: string
  lat: number
  lng: number
  location_verified: boolean
  region: string | null
  injury_flag: boolean
  police_report_ref: string | null
  one_sided_flag: boolean
  location_description?: string | null
  parties?: CaseParty[]
  fault_decision?: FaultDecision | null
  reports?: CaseReportSummary[]
  claims?: CaseClaimSummary[]
  created_at: string
}
