<?php

namespace Database\Factories;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AuditLog>
 */
class AuditLogFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'action' => 'updated',
            'entity_type' => 'FaultDecision',
            'entity_id' => fake()->numberBetween(1, 1000),
            'changes' => ['status' => 'final'],
        ];
    }
}
