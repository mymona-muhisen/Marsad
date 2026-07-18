<?php

namespace Database\Factories;

use App\Models\LiabilityRule;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LiabilityRule>
 */
class LiabilityRuleFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'scenario_code' => strtoupper(fake()->unique()->lexify('SCEN_????')),
            'description_ar' => fake()->sentence(),
            'fault_split_a' => 100,
            'fault_split_b' => 0,
            'version' => 1,
            'effective_from' => now()->subYear()->toDateString(),
            'effective_to' => null,
        ];
    }
}
