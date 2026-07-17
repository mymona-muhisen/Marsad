<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'full_name' => fake()->name(),
            'phone' => fake()->unique()->numerify('09########'),
            'email' => fake()->unique()->safeEmail(),
            'national_id' => null,
            'phone_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'organization_id' => null,
            'zone' => null,
            'locale' => 'ar',
            'status' => 'active',
        ];
    }

    /**
     * Indicate that the model's phone is unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'phone_verified_at' => null,
        ]);
    }

    /**
     * Attach the user to an organization (staff roles).
     */
    public function forOrganization(int $organizationId): static
    {
        return $this->state(fn (array $attributes) => [
            'organization_id' => $organizationId,
        ]);
    }

    /**
     * Assign a surveyor's home zone (FR-C5 dispatch assignment).
     */
    public function inZone(string $zone): static
    {
        return $this->state(fn (array $attributes) => [
            'zone' => $zone,
        ]);
    }
}
