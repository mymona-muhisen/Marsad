<?php

namespace Tests\Feature\Seeders;

use App\Enums\CaseStatus;
use App\Enums\ClaimStatus;
use App\Models\AccidentCase;
use App\Models\Claim;
use Database\Seeders\DemoSeeder;
use Database\Seeders\OrganizationSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeds_one_case_in_every_lifecycle_state(): void
    {
        $this->seed(RoleSeeder::class);
        $this->seed(OrganizationSeeder::class);
        $this->seed(DemoSeeder::class);

        foreach (CaseStatus::cases() as $status) {
            // At least one, not exactly one: every claim-status fixture
            // (task 4's other half) is itself scaffolded on a `final` case,
            // so `final` legitimately has more than one demo row.
            $this->assertGreaterThanOrEqual(
                1,
                AccidentCase::where('status', $status->value)->count(),
                "Expected at least one demo case in status [{$status->value}]",
            );
        }
    }

    public function test_seeds_claims_in_every_status(): void
    {
        $this->seed(RoleSeeder::class);
        $this->seed(OrganizationSeeder::class);
        $this->seed(DemoSeeder::class);

        foreach (ClaimStatus::cases() as $status) {
            $this->assertSame(
                1,
                Claim::where('status', $status->value)->count(),
                "Expected exactly one demo claim in status [{$status->value}]",
            );
        }
    }
}
