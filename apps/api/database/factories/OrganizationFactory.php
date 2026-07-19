<?php

namespace Database\Factories;

use App\Enums\OrganizationType;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Organization>
 */
class OrganizationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name_ar' => fake()->company(),
            'name_en' => fake()->company(),
            'type' => fake()->randomElement(OrganizationType::cases())->value,
            'license_no' => fake()->unique()->bothify('LIC-####'),
            'status' => 'active',
        ];
    }
}
