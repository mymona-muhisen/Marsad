<?php

namespace Database\Factories;

use App\Enums\CasePartyRole;
use App\Models\AccidentCase;
use App\Models\CaseParty;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CaseParty>
 */
class CasePartyFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'case_id' => AccidentCase::factory(),
            'user_id' => null,
            'vehicle_id' => null,
            'policy_id' => null,
            'role' => CasePartyRole::Reporter->value,
            'unregistered_plate' => null,
            'unregistered_phone' => null,
            'statement_text' => fake()->sentence(),
            'joined_at' => null,
            'join_token' => null,
            'join_token_expires_at' => null,
        ];
    }

    /**
     * @return $this
     */
    public function counterparty(): static
    {
        return $this->state(['role' => CasePartyRole::Counterparty->value]);
    }
}
