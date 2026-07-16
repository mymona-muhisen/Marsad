<?php

namespace Database\Factories;

use App\Enums\OrganizationType;
use App\Enums\PolicyType;
use App\Enums\VerificationStatus;
use App\Models\InsurancePolicy;
use App\Models\Organization;
use App\Models\Vehicle;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InsurancePolicy>
 */
class InsurancePolicyFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startDate = fake()->dateTimeBetween('-1 year', 'now');

        return [
            'vehicle_id' => Vehicle::factory(),
            'insurer_org_id' => Organization::factory()->state(['type' => OrganizationType::Insurer->value]),
            'policy_no' => strtoupper(fake()->unique()->bothify('POL-########')),
            'type' => fake()->randomElement(PolicyType::cases())->value,
            'start_date' => $startDate,
            'end_date' => (clone $startDate)->modify('+1 year'),
            'verification_status' => VerificationStatus::Unverified->value,
            'document_path' => null,
        ];
    }

    /**
     * @return $this
     */
    public function pending(): static
    {
        return $this->state(['verification_status' => VerificationStatus::Pending->value]);
    }

    /**
     * @return $this
     */
    public function verified(): static
    {
        return $this->state([
            'verification_status' => VerificationStatus::Verified->value,
            'verified_at' => now(),
        ]);
    }

    /**
     * @return $this
     */
    public function expiringInDays(int $days): static
    {
        return $this->state(fn () => [
            'start_date' => now()->subYear(),
            'end_date' => now()->addDays($days)->startOfDay(),
            'verification_status' => VerificationStatus::Verified->value,
            'verified_at' => now(),
        ]);
    }
}
