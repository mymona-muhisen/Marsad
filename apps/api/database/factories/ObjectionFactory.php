<?php

namespace Database\Factories;

use App\Enums\ObjectionStatus;
use App\Models\CaseParty;
use App\Models\FaultDecision;
use App\Models\Objection;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Objection>
 */
class ObjectionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'decision_id' => FaultDecision::factory(),
            'party_id' => CaseParty::factory(),
            'reason' => fake()->sentence(),
            'status' => ObjectionStatus::Open->value,
            'reviewed_by' => null,
            'resolution_note' => null,
            'resolved_at' => null,
        ];
    }
}
