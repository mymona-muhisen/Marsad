<?php

namespace Database\Factories;

use App\Models\PartsPrice;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PartsPrice>
 */
class PartsPriceFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'part_code' => strtoupper(fake()->unique()->bothify('PART-####')),
            'name_ar' => fake()->words(2, true),
            'reference_price' => fake()->numberBetween(50000, 2000000),
            'version' => 1,
            'effective_from' => now()->subYear()->toDateString(),
        ];
    }
}
