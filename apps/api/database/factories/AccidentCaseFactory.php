<?php

namespace Database\Factories;

use App\Enums\CaseChannel;
use App\Enums\CaseStatus;
use App\Models\AccidentCase;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<AccidentCase>
 */
class AccidentCaseFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'case_no' => 'MC-'.now()->format('y').'-'.strtoupper(Str::random(6)),
            'reported_by' => User::factory(),
            'channel' => CaseChannel::Self->value,
            'status' => CaseStatus::Draft->value,
            'track' => null,
            'occurred_at' => now()->subHour(),
            'lat' => fake()->latitude(33.4, 33.6),
            'lng' => fake()->longitude(36.2, 36.4),
            'location_verified' => true,
            'region' => 'Damascus',
            'injury_flag' => false,
            'police_report_ref' => null,
            'one_sided_flag' => false,
        ];
    }
}
