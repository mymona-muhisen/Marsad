<?php

namespace Tests\Feature\Claims;

use App\Enums\ClaimStatus;
use App\Enums\OrganizationType;
use App\Enums\RoleName;
use App\Models\Claim;
use App\Models\Organization;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettlementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    private function insurerAgent(Organization $org): User
    {
        $user = User::factory()->create(['organization_id' => $org->id]);
        $user->assignRole(RoleName::InsurerAgent->value);

        return $user;
    }

    public function test_cash_settlement_closes_the_claim(): void
    {
        $org = Organization::factory()->create();
        $agent = $this->insurerAgent($org);
        $claim = Claim::factory()->create(['insurer_org_id' => $org->id, 'status' => ClaimStatus::Approved->value]);

        $response = $this->actingAs($agent)->postJson("/api/v1/insurer/claims/{$claim->id}/settlement", [
            'mode' => 'cash',
            'amount' => 1500000,
        ]);

        $response->assertCreated()->assertJsonPath('data.mode', 'cash');

        $this->assertDatabaseHas('claims', ['id' => $claim->id, 'status' => ClaimStatus::Closed->value]);
        $this->assertDatabaseHas('claim_events', ['claim_id' => $claim->id, 'action' => 'settled']);
        $this->assertDatabaseHas('claim_events', ['claim_id' => $claim->id, 'action' => 'closed']);
    }

    public function test_repair_order_requires_a_workshop_organization(): void
    {
        $org = Organization::factory()->create();
        $agent = $this->insurerAgent($org);
        $claim = Claim::factory()->create(['insurer_org_id' => $org->id, 'status' => ClaimStatus::Approved->value]);

        $this->actingAs($agent)->postJson("/api/v1/insurer/claims/{$claim->id}/settlement", [
            'mode' => 'repair_order',
            'amount' => 1200000,
        ])->assertUnprocessable()->assertJsonValidationErrors('workshop_org_id');

        $workshop = Organization::factory()->create(['type' => OrganizationType::Workshop->value]);

        $this->actingAs($agent)->postJson("/api/v1/insurer/claims/{$claim->id}/settlement", [
            'mode' => 'repair_order',
            'amount' => 1200000,
            'workshop_org_id' => $workshop->id,
        ])->assertCreated();
    }

    public function test_a_claim_cannot_be_settled_twice(): void
    {
        $org = Organization::factory()->create();
        $agent = $this->insurerAgent($org);
        $claim = Claim::factory()->create(['insurer_org_id' => $org->id, 'status' => ClaimStatus::Approved->value]);

        $this->actingAs($agent)->postJson("/api/v1/insurer/claims/{$claim->id}/settlement", [
            'mode' => 'cash',
            'amount' => 500000,
        ])->assertCreated();

        $this->actingAs($agent)->postJson("/api/v1/insurer/claims/{$claim->id}/settlement", [
            'mode' => 'cash',
            'amount' => 500000,
        ])->assertUnprocessable();
    }
}
