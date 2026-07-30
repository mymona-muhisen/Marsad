import { apiFetch } from '@/lib/api/client'

/** Mirrors `RegulatorReportService::slaReport()` — one row per insurer. */
export type InsurerSlaRow = {
  insurer_org_id: number
  insurer_name: string
  claims_count: number
  breached_count: number
  /** Null until at least one claim of theirs has been settled. */
  average_settlement_hours: number | null
}

/** Mirrors `FraudFlagAnalyticsService::summary()`. */
export type FraudSummary = {
  total: number
  by_reason: { reason: string; count: number }[]
  daily_counts: { date: string; count: number }[]
}

/** Mirrors `AccidentAnalyticsService::heatmap()` — bucketed, never per-case. */
export type DensityBucket = { lat: number; lng: number; count: number }

export type BlackSpot = { region: string; count: number }

export type AnalyticsFilters = {
  from?: string
  to?: string
  track?: string
}

function filterQuery(filters: AnalyticsFilters) {
  return {
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
    ...(filters.track ? { track: filters.track } : {}),
  }
}

export function fetchSlaReport(): Promise<{ data: InsurerSlaRow[] }> {
  return apiFetch<{ data: InsurerSlaRow[] }>('regulator/sla-report')
}

export function fetchFraudSummary(days: number): Promise<{ data: FraudSummary }> {
  return apiFetch<{ data: FraudSummary }>('regulator/fraud-flags', {
    query: { days },
  })
}

export function fetchDensity(
  filters: AnalyticsFilters,
): Promise<{ data: DensityBucket[] }> {
  return apiFetch<{ data: DensityBucket[] }>('authority/heatmap', {
    query: filterQuery(filters),
  })
}

export function fetchBlackSpots(
  filters: AnalyticsFilters,
  limit = 10,
): Promise<{ data: BlackSpot[] }> {
  return apiFetch<{ data: BlackSpot[] }>('authority/black-spots', {
    query: { limit, ...filterQuery(filters) },
  })
}

export const slaReportQueryKey = ['regulator', 'sla-report'] as const
export const fraudSummaryQueryKey = ['regulator', 'fraud-flags'] as const
export const densityQueryKey = ['authority', 'heatmap'] as const
export const blackSpotsQueryKey = ['authority', 'black-spots'] as const
