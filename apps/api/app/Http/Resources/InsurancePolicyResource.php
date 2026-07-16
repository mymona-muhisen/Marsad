<?php

namespace App\Http\Resources;

use App\Models\InsurancePolicy;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin InsurancePolicy
 */
class InsurancePolicyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'vehicle_id' => $this->vehicle_id,
            'insurer_org_id' => $this->insurer_org_id,
            'insurer_name' => $this->whenLoaded('insurer', fn () => $this->insurer->name_ar),
            'policy_no' => $this->policy_no,
            'type' => $this->type,
            'start_date' => $this->start_date->toDateString(),
            'end_date' => $this->end_date->toDateString(),
            'verification_status' => $this->verification_status,
            'verified_at' => $this->verified_at,
            'document_path' => $this->document_path,
            'created_at' => $this->created_at,
        ];
    }
}
