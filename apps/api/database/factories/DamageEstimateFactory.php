<?php

namespace Database\Factories;

use App\Enums\DamageEstimateStatus;
use App\Enums\DamageEstimateType;
use App\Models\Claim;
use App\Models\DamageEstimate;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DamageEstimate>
 */
class DamageEstimateFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'claim_id' => Claim::factory(),
            'submitted_by' => User::factory(),
            'org_id' => null,
            'type' => DamageEstimateType::Workshop->value,
            'status' => DamageEstimateStatus::Submitted->value,
            'total' => 0,
        ];
    }
}
