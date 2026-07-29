<?php

namespace Tests\Feature\Claims;

use App\Enums\CasePartyRole;
use App\Enums\CaseStatus;
use App\Enums\OrganizationType;
use App\Enums\RoleName;
use App\Enums\VerificationStatus;
use App\Models\AccidentCase;
use App\Models\CaseParty;
use App\Models\Claim;
use App\Models\InsurancePolicy;
use App\Models\Organization;
use App\Models\User;
use Database\Seeders\OrganizationSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Who may read the insurer console and who may act in it.
 *
 * Doc 01 §B.4 splits the two insurer roles: the agent "process[es] claims,
 * approve[s] settlements", while the admin gets an "SLA dashboard" and the
 * "accredited workshop list" — views over the same data, not authority over it.
 */
class InsurerConsoleAccessTest extends TestCase
{
    use RefreshDatabase;

    private Organization $insurer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(OrganizationSeeder::class);

        $this->insurer = Organization::where('type', OrganizationType::Insurer->value)->firstOrFail();
    }

    private function staff(RoleName $role, ?Organization $organization = null): User
    {
        $user = User::factory()->create([
            'organization_id' => ($organization ?? $this->insurer)->id,
        ]);
        $user->assignRole($role->value);

        return $user;
    }

    private function claim(?Organization $insurer = null): Claim
    {
        $case = AccidentCase::factory()->create(['status' => CaseStatus::Final->value]);
        $party = CaseParty::factory()->create([
            'case_id' => $case->id,
            'role' => CasePartyRole::Reporter->value,
            'user_id' => User::factory(),
        ]);

        return Claim::factory()->create([
            'case_id' => $case->id,
            'claimant_party_id' => $party->id,
            'insurer_org_id' => ($insurer ?? $this->insurer)->id,
        ]);
    }

    public function test_an_insurer_admin_can_read_the_claims_console(): void
    {
        // Before this the frontend offered the admin these screens and every
        // request answered 403.
        $this->claim();

        $this->actingAs($this->staff(RoleName::InsurerAdmin))
            ->getJson('/api/v1/insurer/claims')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_an_insurer_admin_can_read_a_single_claim(): void
    {
        $claim = $this->claim();

        $this->actingAs($this->staff(RoleName::InsurerAdmin))
            ->getJson("/api/v1/insurer/claims/{$claim->id}")
            ->assertOk();
    }

    public function test_an_insurer_admin_cannot_decide_a_claim(): void
    {
        $claim = $this->claim();

        $this->actingAs($this->staff(RoleName::InsurerAdmin))
            ->postJson("/api/v1/insurer/claims/{$claim->id}/decide", [
                'outcome' => 'approve',
                'reason_code' => 'fully_covered',
            ])
            ->assertForbidden();
    }

    public function test_an_insurer_admin_cannot_record_a_settlement(): void
    {
        $claim = $this->claim();

        $this->actingAs($this->staff(RoleName::InsurerAdmin))
            ->postJson("/api/v1/insurer/claims/{$claim->id}/settlement", [
                'mode' => 'cash',
                'amount' => 1000,
            ])
            ->assertForbidden();
    }

    public function test_an_insurer_admin_cannot_verify_a_policy(): void
    {
        // A real row is needed: SubstituteBindings runs ahead of the role
        // middleware, so a missing id answers 404 before authorisation is
        // ever consulted.
        $policy = InsurancePolicy::factory()->create([
            'insurer_org_id' => $this->insurer->id,
            'verification_status' => VerificationStatus::Pending->value,
        ]);

        $this->actingAs($this->staff(RoleName::InsurerAdmin))
            ->postJson("/api/v1/insurer/policies/{$policy->id}/verify")
            ->assertForbidden();
    }

    public function test_an_insurer_agent_can_still_verify_a_policy(): void
    {
        $policy = InsurancePolicy::factory()->create([
            'insurer_org_id' => $this->insurer->id,
            'verification_status' => VerificationStatus::Pending->value,
        ]);

        $this->actingAs($this->staff(RoleName::InsurerAgent))
            ->postJson("/api/v1/insurer/policies/{$policy->id}/verify")
            ->assertOk();
    }

    public function test_reads_stay_scoped_to_the_caller_organization(): void
    {
        $other = Organization::where('type', OrganizationType::Insurer->value)
            ->where('id', '!=', $this->insurer->id)
            ->firstOrFail();

        $this->claim($other);

        // An admin reading their own company's queue must not see a rival's.
        $this->actingAs($this->staff(RoleName::InsurerAdmin))
            ->getJson('/api/v1/insurer/claims')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_workshops_lists_only_active_accredited_workshops(): void
    {
        Organization::factory()->create([
            'type' => OrganizationType::Workshop->value,
            'status' => 'suspended',
            'name_ar' => 'ورشة موقوفة',
        ]);

        $response = $this->actingAs($this->staff(RoleName::InsurerAgent))
            ->getJson('/api/v1/insurer/workshops');

        $response->assertOk();

        $names = collect($response->json('data'))->pluck('name_ar');
        $types = collect($response->json('data'))->pluck('type')->unique();

        // A suspended workshop must not be selectable on a repair order.
        $this->assertNotContains('ورشة موقوفة', $names);
        $this->assertSame([OrganizationType::Workshop->value], $types->all());
        $this->assertGreaterThan(0, $names->count());
    }

    public function test_workshops_is_closed_to_roles_outside_the_insurer(): void
    {
        foreach ([RoleName::Citizen, RoleName::Surveyor, RoleName::Regulator] as $role) {
            $user = User::factory()->create();
            $user->assignRole($role->value);

            $this->actingAs($user)
                ->getJson('/api/v1/insurer/workshops')
                ->assertForbidden();
        }
    }
}
