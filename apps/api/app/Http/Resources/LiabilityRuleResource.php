<?php

namespace App\Http\Resources;

use App\Models\LiabilityRule;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin LiabilityRule
 */
class LiabilityRuleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'scenario_code' => $this->scenario_code,
            'description_ar' => $this->description_ar,
            'fault_split_a' => $this->fault_split_a,
            'fault_split_b' => $this->fault_split_b,
            // Surfaced so the console can show which version a proposal came
            // from — decisions pin the rule id, and reference data is versioned
            // rather than updated in place (CLAUDE.md rule 5).
            'version' => $this->version,
            'effective_from' => $this->effective_from,
        ];
    }
}
