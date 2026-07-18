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

class ClaimDecisionTest extends TestCase
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

    public function test_decide_requires_a_reason_code_for_every_outcome(): void
    {
        $org = Organization::factory()->create();
        $agent = $this->insurerAgent($org);
        $claim = Claim::factory()->create(['insurer_org_id' => $org->id]);

        $this->actingAs($agent)->postJson("/api/v1/insurer/claims/{$claim->id}/decide", [
            'outcome' => 'approve',
        ])->assertUnprocessable()->assertJsonValidationErrors('reason_code');

        $this->actingAs($agent)->postJson("/api/v1/insurer/claims/{$claim->id}/decide", [
            'outcome' => 'approve',
            'reason_code' => 'fully_covered',
        ])->assertOk()->assertJsonPath('data.status', ClaimStatus::Approved->value);
    }

    public function test_each_outcome_maps_to_the_expected_claim_status(): void
    {
        $org = Organization::factory()->create();
        $agent = $this->insurerAgent($org);

        $cases = [
            ['approve', 'fully_covered', ClaimStatus::Approved->value],
            ['partial', 'coverage_limit', ClaimStatus::PartiallyApproved->value],
            ['reject', 'policy_lapsed', ClaimStatus::Rejected->value],
            ['request_info', 'missing_documents', ClaimStatus::InfoRequested->value],
        ];

        foreach ($cases as [$outcome, $reasonCode, $expectedStatus]) {
            $claim = Claim::factory()->create(['insurer_org_id' => $org->id]);

            $this->actingAs($agent)->postJson("/api/v1/insurer/claims/{$claim->id}/decide", [
                'outcome' => $outcome,
                'reason_code' => $reasonCode,
            ])->assertOk()->assertJsonPath('data.status', $expectedStatus);
        }
    }

    public function test_request_info_does_not_change_the_sla_due_date(): void
    {
        $org = Organization::factory()->create();
        $agent = $this->insurerAgent($org);
        $slaDueAt = now()->addDays(3);
        $claim = Claim::factory()->create(['insurer_org_id' => $org->id, 'sla_due_at' => $slaDueAt]);

        $this->actingAs($agent)->postJson("/api/v1/insurer/claims/{$claim->id}/decide", [
            'outcome' => 'request_info',
            'reason_code' => 'missing_documents',
        ])->assertOk();

        $this->assertSame($slaDueAt->toDateTimeString(), $claim->fresh()->sla_due_at->toDateTimeString());
    }

    public function test_insurer_agent_cannot_decide_a_claim_from_another_organization(): void
    {
        $orgA = Organization::factory()->create();
        $orgB = Organization::factory()->create();
        $agentA = $this->insurerAgent($orgA);
        $claimForB = Claim::factory()->create(['insurer_org_id' => $orgB->id]);

        $this->actingAs($agentA)->postJson("/api/v1/insurer/claims/{$claimForB->id}/decide", [
            'outcome' => 'approve',
            'reason_code' => 'fully_covered',
        ])->assertForbidden();
    }

    public function test_a_settled_claim_cannot_be_decided_again(): void
    {
        $org = Organization::factory()->create();
        $agent = $this->insurerAgent($org);
        $claim = Claim::factory()->create(['insurer_org_id' => $org->id, 'status' => ClaimStatus::Settled->value]);

        $this->actingAs($agent)->postJson("/api/v1/insurer/claims/{$claim->id}/decide", [
            'outcome' => 'approve',
            'reason_code' => 'fully_covered',
        ])->assertUnprocessable();
    }

    public function test_insurer_index_lists_only_their_own_organizations_claims(): void
    {
        $orgA = Organization::factory()->create();
        $orgB = Organization::factory()->create();
        $agentA = $this->insurerAgent($orgA);

        Claim::factory()->create(['insurer_org_id' => $orgA->id]);
        Claim::factory()->create(['insurer_org_id' => $orgB->id]);

        $response = $this->actingAs($agentA)->getJson('/api/v1/insurer/claims');

        $response->assertOk()->assertJsonCount(1, 'data');
    }
}
