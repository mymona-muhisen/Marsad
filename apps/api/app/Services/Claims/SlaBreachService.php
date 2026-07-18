<?php

namespace App\Services\Claims;

use App\Enums\ClaimStatus;
use App\Models\Claim;

/**
 * "request_info does NOT pause SLA" (FR-CL2) is satisfied by omission: no
 * code path anywhere extends or pauses `claims.sla_due_at` once set — the
 * absence of a pause mechanism is the deliberate implementation of that rule.
 */
class SlaBreachService
{
    public function __construct(private readonly ClaimTimelineService $timeline) {}

    public function flagBreaches(): int
    {
        $flagged = 0;

        $breached = Claim::query()
            ->whereNotIn('status', [ClaimStatus::Settled->value, ClaimStatus::Closed->value])
            ->where('sla_due_at', '<', now())
            ->whereDoesntHave('events', fn ($query) => $query->where('action', 'sla_breached'))
            ->get();

        foreach ($breached as $claim) {
            $this->timeline->log($claim, null, 'sla_breached');
            $flagged++;
        }

        return $flagged;
    }
}
