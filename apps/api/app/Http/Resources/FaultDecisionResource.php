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
        $windowHours = (int) config('fault.objection_window_hours');
        // `decided_at` is NOT NULL — a decision cannot exist without one.
        $deadline = $this->decided_at->copy()->addHours($windowHours);

        return [
            'id' => $this->id,
            'case_id' => $this->case_id,
            'rule_id' => $this->rule_id,
            'scenario_code' => $this->whenLoaded('rule', fn () => $this->rule?->scenario_code),
            // FR-F2: the citizen sees the rule their decision rests on, in
            // plain Arabic. A percentage with no cited reason is not something
            // a person can meaningfully object to.
            'rule_description_ar' => $this->whenLoaded('rule', fn () => $this->rule?->description_ar),
            'status' => $this->status,
            'was_overridden' => $this->was_overridden,
            'justification' => $this->justification,
            'decided_at' => $this->decided_at,
            'objection_window_hours' => $windowHours,
            'objection_deadline' => $deadline,
            /*
             | The countdown ticks down from this, not from the deadline: a
             | device with a wrong clock would otherwise show the citizen the
             | wrong time left to object. Never negative — the window is simply
             | closed at zero.
             */
            'objection_seconds_remaining' => max(0, (int) now()->diffInSeconds($deadline, false)),
            'allocations' => $this->whenLoaded('allocations', fn () => $this->allocations->map(fn ($allocation) => [
                'party_id' => $allocation->party_id,
                'percentage' => $allocation->percentage,
            ])),
            'objections' => ObjectionResource::collection($this->whenLoaded('objections')),
        ];
    }
}
