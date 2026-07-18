<?php

namespace App\Http\Resources;

use App\Models\FaultDecision;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin FaultDecision
 */
class FaultDecisionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'case_id' => $this->case_id,
            'rule_id' => $this->rule_id,
            'scenario_code' => $this->whenLoaded('rule', fn () => $this->rule?->scenario_code),
            'status' => $this->status,
            'was_overridden' => $this->was_overridden,
            'justification' => $this->justification,
            'decided_at' => $this->decided_at,
            'allocations' => $this->whenLoaded('allocations', fn () => $this->allocations->map(fn ($allocation) => [
                'party_id' => $allocation->party_id,
                'percentage' => $allocation->percentage,
            ])),
        ];
    }
}
