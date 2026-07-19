<?php

namespace Database\Factories;

use App\Models\CaseParty;
use App\Models\FaultAllocation;
use App\Models\FaultDecision;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FaultAllocation>
 */
class FaultAllocationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'decision_id' => FaultDecision::factory(),
            'party_id' => CaseParty::factory(),
            'percentage' => 100,
        ];
    }
}
