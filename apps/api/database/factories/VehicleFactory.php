<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Vehicle>
 */
class VehicleFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'owner_id' => User::factory(),
            'plate_no' => strtoupper(fake()->unique()->bothify('###-???')),
            'vin' => strtoupper(fake()->unique()->bothify('VIN#########')),
            'make' => fake()->randomElement(['Kia', 'Hyundai', 'Toyota', 'Chevrolet', 'Peugeot']),
            'model' => fake()->word(),
            'year' => fake()->numberBetween(1990, 2026),
            'color' => fake()->safeColorName(),
        ];
    }
}
