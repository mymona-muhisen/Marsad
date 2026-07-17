<?php

namespace App\Http\Resources;

use App\Models\CaseParty;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CaseParty
 */
class CasePartyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'role' => $this->role,
            'user_id' => $this->user_id,
            'vehicle_id' => $this->vehicle_id,
            'policy_id' => $this->policy_id,
            'unregistered_plate' => $this->unregistered_plate,
            'statement_text' => $this->statement_text,
            'joined_at' => $this->joined_at,
            'evidence' => EvidenceItemResource::collection($this->whenLoaded('evidenceItems')),
        ];
    }
}
