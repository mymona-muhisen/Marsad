<?php

namespace App\Http\Resources;

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
        return [
            'id' => $this->id,
            'case_id' => $this->case_id,
            'claimant_party_id' => $this->claimant_party_id,
            'insurer_org_id' => $this->insurer_org_id,
            'status' => $this->status,
            'sla_due_at' => $this->sla_due_at,
            'created_at' => $this->created_at,
            'events' => ClaimEventResource::collection($this->whenLoaded('events')),
            'estimates' => DamageEstimateResource::collection($this->whenLoaded('estimates')),
            'settlement' => $this->whenLoaded('settlement', fn () => $this->settlement ? new SettlementResource($this->settlement) : null),
        ];
    }
}
