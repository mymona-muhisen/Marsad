<?php

namespace App\Services\Claims;

use App\Models\Claim;
use App\Models\ClaimEvent;
use App\Models\User;

/**
 * Append-only claim timeline writer (doc 04 §2.5): "status alone loses
 * history" — every mutation, including system-generated ones, logs a row.
 */
class ClaimTimelineService
{
    public function log(Claim $claim, ?User $actor, string $action, ?string $reasonCode = null, ?string $note = null): ClaimEvent
    {
        return ClaimEvent::create([
            'claim_id' => $claim->id,
            'actor_id' => $actor?->id,
            'action' => $action,
            'reason_code' => $reasonCode,
            'note' => $note,
        ]);
    }
}
