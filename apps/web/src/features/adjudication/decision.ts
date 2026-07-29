import type { LiabilityRule } from '@/lib/api/types'

export type Allocation = { party_id: number; percentage: number }

export function totalPercentage(allocations: Allocation[]): number {
  return allocations.reduce((sum, item) => sum + (item.percentage || 0), 0)
}

/**
 * Whether the split departs from the chosen rule's default.
 *
 * Mirrors `FaultDecisionService::matchesRuleSplit()` exactly, including the
 * sort: the rule states a split (100/0) without saying which party is which,
 * so assigning 100 to either party still counts as following the rule. Only
 * the multiset of percentages matters.
 *
 * No rule selected means a manual decision, which the backend always treats as
 * an override.
 */
export function isOverride(
  rule: LiabilityRule | null,
  allocations: Allocation[],
): boolean {
  if (!rule) return true

  const submitted = allocations
    .map((item) => item.percentage)
    .sort((a, b) => a - b)
  const ruleSplit = [rule.fault_split_a, rule.fault_split_b].sort(
    (a, b) => a - b,
  )

  if (submitted.length !== ruleSplit.length) return true

  return submitted.some((value, index) => value !== ruleSplit[index])
}

/** The backend rejects a decision that departs from the rule with no reason. */
export function requiresJustification(
  rule: LiabilityRule | null,
  allocations: Allocation[],
): boolean {
  return isOverride(rule, allocations)
}

export type DecisionGate =
  | { ok: true }
  | { ok: false; reason: 'total' | 'justification' }

/**
 * Gates the submit button on the same two rules the API enforces, so the
 * reviewer is not told "no" by a round trip they could have been spared.
 */
export function checkDecision(
  rule: LiabilityRule | null,
  allocations: Allocation[],
  justification: string,
): DecisionGate {
  if (totalPercentage(allocations) !== 100) {
    return { ok: false, reason: 'total' }
  }

  if (
    requiresJustification(rule, allocations) &&
    justification.trim().length === 0
  ) {
    return { ok: false, reason: 'justification' }
  }

  return { ok: true }
}

/**
 * Seeds the split from a rule. The rule does not name which party carries
 * which share, so the larger share goes to the counterparty by convention and
 * the reviewer swaps it if the evidence says otherwise.
 */
export function proposalFor(
  rule: LiabilityRule,
  partyIds: number[],
): Allocation[] {
  const [first, second] = [rule.fault_split_a, rule.fault_split_b]

  return partyIds.map((party_id, index) => ({
    party_id,
    percentage: index === 0 ? second : first,
  }))
}
