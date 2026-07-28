import type { Role } from '@/lib/roles'

/**
 * The app's section map, mirroring the backend's route groups in
 * `routes/api.php` — `surveyor/*` needs `surveyor`, `insurer/*` needs an
 * insurer role, and so on.
 *
 * One registry feeds two consumers: the router builds a role-guarded route per
 * entry, and the home screen lists the entries the signed-in user can reach.
 * Keeping them in sync by construction is why this list exists.
 */
export type Section = {
  /** Key under `sections.` in the lang files. */
  id: string
  path: string
  roles: Role[]
  icon: string
}

export const SECTIONS: readonly Section[] = [
  { id: 'myCases', path: '/app/cases', roles: ['citizen'], icon: 'FileText' },
  {
    id: 'myVehicles',
    path: '/app/vehicles',
    roles: ['citizen'],
    icon: 'CarFront',
  },
  { id: 'myClaims', path: '/app/claims', roles: ['citizen'], icon: 'Wallet' },
  {
    id: 'dispatches',
    path: '/app/surveyor/dispatches',
    roles: ['surveyor'],
    icon: 'ClipboardCheck',
  },
  {
    id: 'adjudicationQueue',
    path: '/app/adjudication/queue',
    roles: ['adjudicator'],
    icon: 'Scale',
  },
  {
    id: 'objections',
    path: '/app/adjudication/objections',
    roles: ['senior_adjudicator'],
    icon: 'Gavel',
  },
  {
    id: 'insurerClaims',
    path: '/app/insurer/claims',
    roles: ['insurer_agent', 'insurer_admin'],
    icon: 'Building2',
  },
  {
    id: 'insurerPolicies',
    path: '/app/insurer/policies',
    roles: ['insurer_agent', 'insurer_admin'],
    icon: 'ShieldCheck',
  },
  {
    id: 'estimates',
    path: '/app/estimates',
    roles: ['assessor', 'workshop'],
    icon: 'Wrench',
  },
  {
    id: 'slaReport',
    path: '/app/regulator/sla',
    roles: ['regulator'],
    icon: 'Clock',
  },
  {
    id: 'fraudFlags',
    path: '/app/regulator/fraud-flags',
    roles: ['regulator'],
    icon: 'Eye',
  },
  {
    id: 'heatmap',
    path: '/app/authority/heatmap',
    roles: ['authority'],
    icon: 'Map',
  },
  {
    id: 'blackSpots',
    path: '/app/authority/black-spots',
    roles: ['authority'],
    icon: 'TriangleAlert',
  },
  {
    id: 'administration',
    path: '/app/admin',
    roles: ['admin', 'super_admin'],
    icon: 'Settings',
  },
]

export function sectionsForRoles(userRoles: readonly string[]): Section[] {
  return SECTIONS.filter((section) =>
    section.roles.some((role) => userRoles.includes(role)),
  )
}
