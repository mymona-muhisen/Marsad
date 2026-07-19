<?php

namespace Tests\Feature\Claims;

use App\Enums\ClaimStatus;
use App\Enums\RoleName;
use App\Models\Claim;
use App\Models\Organization;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegulatorSlaReportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    private function regulator(): User
    {
        $user = User::factory()->create();
        $user->assignRole(RoleName::Regulator->value);

        return $user;
    }

    public function test_non_regulator_cannot_access_the_report(): void
    {
        $citizen = User::factory()->create();

        $this->actingAs($citizen)->getJson('/api/v1/regulator/sla-report')->assertForbidden();
    }

    public function test_report_aggregates_claims_and_breaches_per_insurer(): void
    {
        $org = Organization::factory()->create();

        Claim::factory()->create(['insurer_org_id' => $org->id, 'sla_due_at' => now()->subDay(), 'status' => ClaimStatus::Opened->value]);
        Claim::factory()->create(['insurer_org_id' => $org->id, 'sla_due_at' => now()->addDay(), 'status' => ClaimStatus::Opened->value]);

        $response = $this->actingAs($this->regulator())->getJson('/api/v1/regulator/sla-report');

        $response->assertOk();
        $row = collect($response->json('data'))->firstWhere('insurer_org_id', $org->id);

        $this->assertSame(2, $row['claims_count']);
        $this->assertSame(1, $row['breached_count']);
    }
}
