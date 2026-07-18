<?php

namespace Database\Factories;

use App\Enums\FaultDecisionStatus;
use App\Models\AccidentCase;
use App\Models\FaultDecision;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FaultDecision>
 */
class FaultDecisionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'case_id' => AccidentCase::factory(),
            'rule_id' => null,
            'adjudicator_id' => User::factory(),
            'status' => FaultDecisionStatus::Confirmed->value,
            'was_overridden' => false,
            'justification' => null,
            'decided_at' => now(),
        ];
    }
}
