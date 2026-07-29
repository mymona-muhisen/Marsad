<?php

namespace App\Http\Resources;

use App\Enums\ClaimStatus;
use App\Models\Claim;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Claim
 */
class ClaimResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $secondsToSla = (int) now()->diffInSeconds($this->sla_due_at, false);

        return [
            'id' => $this->id,
            'case_id' => $this->case_id,
            // The claimant's screen needs the accident's public identity to
            // link back; `case_id` is a sequential id that means nothing to a UI.
            'case_no' => $this->whenLoaded('case', fn () => $this->case?->case_no),
            'claimant_party_id' => $this->claimant_party_id,
            'insurer_org_id' => $this->insurer_org_id,
            'status' => $this->status,
            'sla_due_at' => $this->sla_due_at,
            /*
             | Same reasoning as the objection countdown (Sprint 10): the client
             | ticks down from a server figure instead of diffing the deadline
             | against a device clock that may be wrong. Negative here rather
             | than floored at zero — how far past the deadline an insurer is
             | matters to the claimant, unlike an expired objection window.
             */
            'sla_seconds_remaining' => $secondsToSla,
            'sla_breached' => $secondsToSla < 0 && ! in_array(
                $this->status,
                [ClaimStatus::Settled, ClaimStatus::Closed],
                true,
            ),
            'created_at' => $this->created_at,
            'events' => ClaimEventResource::collection($this->whenLoaded('events')),
            'estimates' => DamageEstimateResource::collection($this->whenLoaded('estimates')),
            'settlement' => $this->whenLoaded('settlement', fn () => $this->settlement ? new SettlementResource($this->settlement) : null),
        ];
    }
}
