<?php

namespace Database\Factories;

use App\Models\Claim;
use App\Models\ClaimEvent;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ClaimEvent>
 */
class ClaimEventFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'claim_id' => Claim::factory(),
            'actor_id' => User::factory(),
            'action' => 'opened',
            'reason_code' => null,
            'note' => null,
        ];
    }
}
