<?php

namespace Database\Factories;

use App\Enums\DispatchStatus;
use App\Models\AccidentCase;
use App\Models\Dispatch;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Dispatch>
 */
class DispatchFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'case_id' => AccidentCase::factory(),
            'surveyor_id' => User::factory(),
            'zone' => 'damascus-central',
            'status' => DispatchStatus::Assigned->value,
            'decline_reason' => null,
            'assigned_at' => now(),
            'accepted_at' => null,
            'completed_at' => null,
        ];
    }
}
