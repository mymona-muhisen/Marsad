<?php

namespace Database\Factories;

use App\Enums\EvidenceType;
use App\Models\AccidentCase;
use App\Models\EvidenceItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EvidenceItem>
 */
class EvidenceItemFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'case_id' => AccidentCase::factory(),
            'party_id' => null,
            'uploaded_by' => User::factory(),
            'type' => EvidenceType::Photo->value,
            'file_path' => 'evidence/'.fake()->uuid().'.jpg',
            'sha256' => hash('sha256', fake()->uuid()),
            'lat' => fake()->latitude(33.4, 33.6),
            'lng' => fake()->longitude(36.2, 36.4),
            'captured_at' => now(),
            'superseded_by' => null,
        ];
    }
}
