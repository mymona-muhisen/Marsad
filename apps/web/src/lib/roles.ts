/**
 * The 13 platform roles — mirrors `App\Enums\RoleName` (doc 01 §B.4).
 *
 * Route guards check these names against the `roles` array returned by
 * `/auth/me`, so the frontend's view of authorisation never drifts from the
 * backend's. The backend remains the enforcement point; these guards only
 * decide what to render.
 */
export const ROLES = [
  'citizen',
  'surveyor',
  'adjudicator',
  'senior_adjudicator',
  'insurer_agent',
  'insurer_admin',
  'assessor',
  'workshop',
  'regulator',
  'authority',
  'call_center',
  'admin',
  'super_admin',
] as const

export type Role = (typeof ROLES)[number]

/** Roles scoped to an organization — these users always carry an `organization_id`. */
export const ORG_SCOPED_ROLES: readonly Role[] = [
  'insurer_agent',
  'insurer_admin',
  'assessor',
  'workshop',
]

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value)
}

export function hasAnyRole(
  userRoles: readonly string[],
  allowed: readonly Role[],
): boolean {
  return allowed.some((role) => userRoles.includes(role))
}
