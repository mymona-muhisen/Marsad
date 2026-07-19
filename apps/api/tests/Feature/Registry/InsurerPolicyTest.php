<?php

namespace Tests\Feature\Registry;

use App\Enums\OrganizationType;
use App\Enums\RoleName;
use App\Enums\VerificationStatus;
use App\Models\InsurancePolicy;
use App\Models\Organization;
use App\Models\User;
use App\Models\Vehicle;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InsurerPolicyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    private function makeAgent(Organization $organization): User
    {
        $agent = User::factory()->create(['organization_id' => $organization->id]);
        $agent->assignRole(RoleName::InsurerAgent->value);

        return $agent;
    }

    public function test_citizen_cannot_access_insurer_endpoints(): void
    {
        $citizen = User::factory()->create();

        $this->actingAs($citizen)->getJson('/api/v1/insurer/policies')->assertForbidden();
    }

    public function test_insurer_agent_only_sees_pending_policies_from_their_own_organization(): void
    {
        $orgA = Organization::factory()->create(['type' => OrganizationType::Insurer->value]);
        $orgB = Organization::factory()->create(['type' => OrganizationType::Insurer->value]);

        $agentA = $this->makeAgent($orgA);

        $pendingInA = InsurancePolicy::factory()->pending()->create(['insurer_org_id' => $orgA->id]);
        InsurancePolicy::factory()->verified()->create(['insurer_org_id' => $orgA->id]);
        InsurancePolicy::factory()->pending()->create(['insurer_org_id' => $orgB->id]);

        $response = $this->actingAs($agentA)->getJson('/api/v1/insurer/policies?status=pending');

        $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $pendingInA->id);
    }

    public function test_insurer_agent_cannot_verify_a_policy_from_another_organization(): void
    {
        $orgA = Organization::factory()->create(['type' => OrganizationType::Insurer->value]);
        $orgB = Organization::factory()->create(['type' => OrganizationType::Insurer->value]);

        $agentA = $this->makeAgent($orgA);
        $policyInB = InsurancePolicy::factory()->pending()->create(['insurer_org_id' => $orgB->id]);

        $this->actingAs($agentA)->postJson("/api/v1/insurer/policies/{$policyInB->id}/verify")
            ->assertForbidden();

        $this->assertDatabaseHas('insurance_policies', [
            'id' => $policyInB->id,
            'verification_status' => VerificationStatus::Pending->value,
        ]);
    }

    public function test_insurer_agent_can_verify_a_policy_from_their_own_organization(): void
    {
        $org = Organization::factory()->create(['type' => OrganizationType::Insurer->value]);
        $agent = $this->makeAgent($org);
        $vehicle = Vehicle::factory()->create();
        $policy = InsurancePolicy::factory()->pending()->create([
            'insurer_org_id' => $org->id,
            'vehicle_id' => $vehicle->id,
        ]);

        $response = $this->actingAs($agent)->postJson("/api/v1/insurer/policies/{$policy->id}/verify");

        $response->assertOk()->assertJsonPath('data.verification_status', VerificationStatus::Verified->value);

        $this->assertDatabaseHas('insurance_policies', [
            'id' => $policy->id,
            'verification_status' => VerificationStatus::Verified->value,
            'verified_by' => $agent->id,
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $vehicle->owner_id,
            'template' => 'policy_verified',
        ]);
    }

    public function test_insurer_agent_can_reject_a_policy_with_a_reason(): void
    {
        $org = Organization::factory()->create(['type' => OrganizationType::Insurer->value]);
        $agent = $this->makeAgent($org);
        $vehicle = Vehicle::factory()->create();
        $policy = InsurancePolicy::factory()->pending()->create([
            'insurer_org_id' => $org->id,
            'vehicle_id' => $vehicle->id,
        ]);

        $response = $this->actingAs($agent)->postJson("/api/v1/insurer/policies/{$policy->id}/reject", [
            'reason' => 'المستند غير واضح',
        ]);

        $response->assertOk()->assertJsonPath('data.verification_status', VerificationStatus::Rejected->value);

        $this->assertDatabaseHas('insurance_policies', [
            'id' => $policy->id,
            'verification_status' => VerificationStatus::Rejected->value,
            'verified_by' => $agent->id,
        ]);
    }
}
