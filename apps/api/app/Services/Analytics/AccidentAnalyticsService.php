<?php

namespace App\Services\Analytics;

use App\Models\AccidentCase;
use Illuminate\Database\Eloquent\Builder;

/**
 * FR-D2: authority heatmap + black-spot ranking. Aggregates only — buckets
 * and region names, never a case_no or any party-identifying field.
 */
class AccidentAnalyticsService
{
    /**
     * @param  array{from?: string, to?: string, track?: string}  $filters
     * @return list<array{lat: float, lng: float, count: int}>
     */
    public function heatmap(array $filters = [], float $bucketSize = 0.01): array
    {
        $query = AccidentCase::query();
        $this->applyFilters($query, $filters);

        return $query->get(['lat', 'lng'])
            ->groupBy(fn (AccidentCase $case) => $this->bucket((float) $case->lat, $bucketSize).'|'.$this->bucket((float) $case->lng, $bucketSize))
            ->map(function ($group) use ($bucketSize) {
                /** @var AccidentCase $first */
                $first = $group->first();

                return [
                    'lat' => $this->bucket((float) $first->lat, $bucketSize),
                    'lng' => $this->bucket((float) $first->lng, $bucketSize),
                    'count' => $group->count(),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @param  array{from?: string, to?: string, track?: string}  $filters
     * @return list<array{region: string, count: int}>
     */
    public function blackSpots(array $filters = [], int $limit = 10): array
    {
        $query = AccidentCase::query()->whereNotNull('region');
        $this->applyFilters($query, $filters);

        return $query->select('region')
            ->selectRaw('COUNT(*) as count')
            ->groupBy('region')
            ->orderByDesc('count')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => ['region' => $row->region, 'count' => (int) $row->getAttribute('count')])
            ->all();
    }

    /**
     * @param  Builder<AccidentCase>  $query
     * @param  array{from?: string, to?: string, track?: string}  $filters
     */
    private function applyFilters(Builder $query, array $filters): void
    {
        if (! empty($filters['from'])) {
            $query->whereDate('occurred_at', '>=', $filters['from']);
        }

        if (! empty($filters['to'])) {
            $query->whereDate('occurred_at', '<=', $filters['to']);
        }

        if (! empty($filters['track'])) {
            $query->where('track', $filters['track']);
        }
    }

    private function bucket(float $value, float $bucketSize): float
    {
        return round(floor($value / $bucketSize) * $bucketSize, 4);
    }
}
