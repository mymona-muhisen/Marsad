<?php

namespace App\Services\Claims;

use App\Enums\ClaimStatus;
use App\Models\Claim;

/**
 * FR-D1: "claims volume, average settlement time, SLA breaches per
 * insurer" — aggregate only, no personal data.
 */
class RegulatorReportService
{
    /**
     * @return list<array{insurer_org_id: int, insurer_name: string, claims_count: int, breached_count: int, average_settlement_hours: float|null}>
     */
    public function slaReport(): array
    {
        $claims = Claim::query()->with(['insurer', 'settlement'])->get();

        return $claims->groupBy('insurer_org_id')->map(function ($group) {
            $settled = $group->filter(fn (Claim $claim) => $claim->settlement !== null);

            $averageSettlementHours = $settled->isEmpty() ? null : round(
                $settled->avg(fn (Claim $claim) => $claim->created_at->diffInHours($claim->settlement->settled_at)),
                1,
            );

            $breachedCount = $group->filter(
                fn (Claim $claim) => $claim->sla_due_at->isPast()
                    && ! in_array($claim->status, [ClaimStatus::Settled, ClaimStatus::Closed], true),
            )->count();

            return [
                'insurer_org_id' => $group->first()->insurer_org_id,
                'insurer_name' => $group->first()->insurer->name_ar,
                'claims_count' => $group->count(),
                'breached_count' => $breachedCount,
                'average_settlement_hours' => $averageSettlementHours,
            ];
        })->values()->all();
    }
}
