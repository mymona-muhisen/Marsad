import { apiFetch } from '@/lib/api/client'
import type { LiabilityRule, Paginated, User } from '@/lib/api/types'

export type AuditLogEntry = {
  id: number
  action: string
  entity_type: string
  entity_id: number
  changes: Record<string, unknown> | null
  created_at: string
  actor?: { full_name: string | null; phone: string | null }
}

export function fetchUsers(filters: {
  q?: string
  role?: string
}): Promise<Paginated<User>> {
  return apiFetch<Paginated<User>>('admin/users', {
    query: {
      per_page: 50,
      // Omitted rather than sent empty: `role` is validated against the enum.
      ...(filters.q ? { q: filters.q } : {}),
      ...(filters.role ? { role: filters.role } : {}),
    },
  })
}

export function syncRoles(input: {
  userId: number
  roles: string[]
}): Promise<{ data: User }> {
  return apiFetch<{ data: User }>(`admin/users/${input.userId}/roles`, {
    // A whole-set replace, not add/remove: two half-applied calls could leave
    // someone with neither their old role nor their new one.
    method: 'POST',
    body: { roles: input.roles },
  })
}

export function fetchAuditLogs(
  entityType?: string,
): Promise<Paginated<AuditLogEntry>> {
  return apiFetch<Paginated<AuditLogEntry>>('admin/audit-logs', {
    query: { per_page: 50, ...(entityType ? { entity_type: entityType } : {}) },
  })
}

export function publishLiabilityRule(input: {
  scenarioCode: string
  descriptionAr: string
  faultSplitA: number
  faultSplitB: number
  effectiveFrom: string
}): Promise<{ data: LiabilityRule }> {
  return apiFetch<{ data: LiabilityRule }>('admin/liability-rules', {
    method: 'POST',
    body: {
      scenario_code: input.scenarioCode,
      description_ar: input.descriptionAr,
      fault_split_a: input.faultSplitA,
      fault_split_b: input.faultSplitB,
      effective_from: input.effectiveFrom,
    },
  })
}

export const adminUsersQueryKey = ['admin', 'users'] as const
export const auditLogsQueryKey = ['admin', 'audit-logs'] as const
