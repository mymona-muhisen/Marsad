<?php

namespace Database\Factories;

use App\Enums\ClaimStatus;
use App\Models\AccidentCase;
use App\Models\CaseParty;
use App\Models\Claim;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Claim>
 */
class ClaimFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'case_id' => AccidentCase::factory(),
            'claimant_party_id' => CaseParty::factory(),
            'insurer_org_id' => Organization::factory(),
            'status' => ClaimStatus::Opened->value,
            'sla_due_at' => now()->addDays(5),
        ];
    }
}
