<?php

namespace Database\Factories;

use App\Enums\SettlementMode;
use App\Models\Claim;
use App\Models\Settlement;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Settlement>
 */
class SettlementFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'claim_id' => Claim::factory(),
            'mode' => SettlementMode::Cash->value,
            'amount' => fake()->numberBetween(100000, 5000000),
            'workshop_org_id' => null,
            'settled_at' => now(),
        ];
    }
}
