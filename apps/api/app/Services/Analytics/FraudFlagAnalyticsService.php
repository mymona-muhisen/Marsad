<?php

namespace App\Services\Analytics;

use App\Models\FraudFlag;

/**
 * FR-D1: "fraud flags" on the regulator dashboard — aggregate counts only,
 * never the underlying case_id/evidence_item_id (those are for ops
 * investigation, not a regulator-facing report).
 */
class FraudFlagAnalyticsService
{
    /**
     * @return array{
     *     total: int,
     *     by_reason: list<array{reason: string, count: int}>,
     *     daily_counts: list<array{date: string, count: int}>,
     * }
     */
    public function summary(int $days = 30): array
    {
        $byReason = FraudFlag::query()
            ->select('reason')
            ->selectRaw('COUNT(*) as count')
            ->groupBy('reason')
            ->get()
            ->map(fn ($row) => ['reason' => $row->reason, 'count' => (int) $row->getAttribute('count')])
            ->all();

        $dailyCounts = FraudFlag::query()
            ->where('created_at', '>=', now()->subDays($days))
            ->selectRaw('DATE(created_at) as date')
            ->selectRaw('COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($row) => ['date' => (string) $row->getAttribute('date'), 'count' => (int) $row->getAttribute('count')])
            ->all();

        return [
            'total' => FraudFlag::query()->count(),
            'by_reason' => $byReason,
            'daily_counts' => $dailyCounts,
        ];
    }
}
