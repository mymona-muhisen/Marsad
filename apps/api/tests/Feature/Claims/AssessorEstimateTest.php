<?php

namespace Tests\Feature\Claims;

use App\Enums\CasePartyRole;
use App\Enums\CaseStatus;
use App\Enums\OrganizationType;
use App\Enums\RoleName;
use App\Models\AccidentCase;
use App\Models\CaseParty;
use App\Models\Claim;
use App\Models\Organization;
use App\Models\PartsPrice;
use App\Models\User;
use Database\Seeders\OrganizationSeeder;
use Database\Seeders\PartsPriceSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Assessor assignment and estimate submission.
 *
 * Before `claims.assessor_org_id` existed, `SubmitEstimateRequest::authorize()`
 * returned a bare `true`: the role middleware let any assessor through and
 * nothing tied them to the claim, so any assessor office in the country could
 * price any claim. These tests pin that shut.
 */
class AssessorEstimateTest extends TestCase
{
    use RefreshDatabase;

    private Organization $insurer;

    private Organization $assessorOffice;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(OrganizationSeeder::class);
        $this->seed(PartsPriceSeeder::class);

        $this->insurer = Organization::where('type', OrganizationType::Insurer->value)->firstOrFail();
        $this->assessorOffice = Organization::where('type', OrganizationType::AssessorOffice->value)->firstOrFail();
    }

    private function staff(RoleName $role, ?Organization $organization): User
    {
        $user = User::factory()->create(['organization_id' => $organization?->id]);
        $user->assignRole($role->value);

        return $user;
    }

    private function claim(?Organization $assessor = null): Claim
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
            'insurer_org_id' => $this->insurer->id,
            'assessor_org_id' => $assessor?->id,
        ]);
    }

    public function test_an_insurer_agent_assigns_an_assessor(): void
    {
        $claim = $this->claim();

        $this->actingAs($this->staff(RoleName::InsurerAgent, $this->insurer))
            ->postJson("/api/v1/insurer/claims/{$claim->id}/assessor", [
                'assessor_org_id' => $this->assessorOffice->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.assessor_org_id', $this->assessorOffice->id);

        $this->assertDatabaseHas('claim_events', [
            'claim_id' => $claim->id,
            'action' => 'assessor_assigned',
        ]);
    }

    public function test_an_insurer_admin_cannot_assign(): void
    {
        $claim = $this->claim();

        // Assigning is acting on the claim, which is the agent's alone.
        $this->actingAs($this->staff(RoleName::InsurerAdmin, $this->insurer))
            ->postJson("/api/v1/insurer/claims/{$claim->id}/assessor", [
                'assessor_org_id' => $this->assessorOffice->id,
            ])
            ->assertForbidden();
    }

    public function test_an_insurer_cannot_assign_a_non_accredited_organization(): void
    {
        $claim = $this->claim();
        $regulator = Organization::where('type', OrganizationType::Regulator->value)->firstOrFail();

        $this->actingAs($this->staff(RoleName::InsurerAgent, $this->insurer))
            ->postJson("/api/v1/insurer/claims/{$claim->id}/assessor", [
                'assessor_org_id' => $regulator->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('assessor_org_id');
    }

    public function test_the_assigned_assessor_sees_the_claim_in_their_list(): void
    {
        $mine = $this->claim($this->assessorOffice);
        $this->claim(); // unassigned
        $this->claim(Organization::where('type', OrganizationType::Workshop->value)->firstOrFail());

        $response = $this->actingAs($this->staff(RoleName::Assessor, $this->assessorOffice))
            ->getJson('/api/v1/assessor/claims');

        $response->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame($mine->id, $response->json('data.0.id'));
    }

    public function test_an_unassigned_assessor_cannot_read_the_claim(): void
    {
        $claim = $this->claim();

        $this->actingAs($this->staff(RoleName::Assessor, $this->assessorOffice))
            ->getJson("/api/v1/assessor/claims/{$claim->id}")
            ->assertForbidden();
    }

    public function test_an_unassigned_assessor_cannot_submit_an_estimate(): void
    {
        $claim = $this->claim();

        // The hole this whole change closes.
        $this->actingAs($this->staff(RoleName::Assessor, $this->assessorOffice))
            ->postJson("/api/v1/claims/{$claim->id}/estimates", [
                'type' => 'assessor',
                'items' => [
                    ['description' => 'مصد أمامي', 'qty' => 1, 'unit_price' => 100000],
                ],
            ])
            ->assertForbidden();
    }

    public function test_a_different_office_cannot_submit_on_someone_elses_assignment(): void
    {
        $claim = $this->claim($this->assessorOffice);
        $otherOffice = Organization::factory()->create([
            'type' => OrganizationType::AssessorOffice->value,
            'status' => 'active',
        ]);

        $this->actingAs($this->staff(RoleName::Assessor, $otherOffice))
            ->postJson("/api/v1/claims/{$claim->id}/estimates", [
                'type' => 'assessor',
                'items' => [
                    ['description' => 'مصد أمامي', 'qty' => 1, 'unit_price' => 100000],
                ],
            ])
            ->assertForbidden();
    }

    public function test_the_assigned_assessor_submits_an_estimate(): void
    {
        $claim = $this->claim($this->assessorOffice);

        $this->actingAs($this->staff(RoleName::Assessor, $this->assessorOffice))
            ->postJson("/api/v1/claims/{$claim->id}/estimates", [
                'type' => 'assessor',
                'items' => [
                    ['description' => 'مصد أمامي', 'qty' => 2, 'unit_price' => 50000],
                ],
            ])
            ->assertCreated()
            // Never submitted by the client — recomputed server-side (doc 04 G10).
            ->assertJsonPath('data.total', '100000.00');
    }

    public function test_the_parts_reference_is_readable_by_the_assessor(): void
    {
        $response = $this->actingAs($this->staff(RoleName::Assessor, $this->assessorOffice))
            ->getJson('/api/v1/assessor/parts-prices');

        $response->assertOk();

        // Being judged against a price list you cannot read is the thing this
        // endpoint exists to stop.
        $this->assertGreaterThan(0, count($response->json('data')));
        $this->assertArrayHasKey('reference_price', $response->json('data.0'));
    }

    public function test_the_reference_returns_only_the_current_version_per_part(): void
    {
        PartsPrice::query()->delete();

        PartsPrice::factory()->create([
            'part_code' => 'BUMPER_F',
            'version' => 1,
            'reference_price' => 80000,
            'effective_from' => now()->subYear()->toDateString(),
        ]);
        PartsPrice::factory()->create([
            'part_code' => 'BUMPER_F',
            'version' => 2,
            'reference_price' => 120000,
            'effective_from' => now()->subMonth()->toDateString(),
        ]);
        // Not in force yet — quoting against it would flag a correct price.
        PartsPrice::factory()->create([
            'part_code' => 'BUMPER_F',
            'version' => 3,
            'reference_price' => 200000,
            'effective_from' => now()->addMonth()->toDateString(),
        ]);

        $response = $this->actingAs($this->staff(RoleName::Assessor, $this->assessorOffice))
            ->getJson('/api/v1/assessor/parts-prices');

        $response->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame(2, $response->json('data.0.version'));
    }

    public function test_a_price_far_from_the_reference_is_flagged(): void
    {
        $claim = $this->claim($this->assessorOffice);
        PartsPrice::query()->delete();
        PartsPrice::factory()->create([
            'part_code' => 'BUMPER_F',
            'version' => 1,
            'reference_price' => 100000,
            'effective_from' => now()->subMonth()->toDateString(),
        ]);

        $response = $this->actingAs($this->staff(RoleName::Assessor, $this->assessorOffice))
            ->postJson("/api/v1/claims/{$claim->id}/estimates", [
                'type' => 'assessor',
                'items' => [
                    // 100% over the reference, well past the 15% threshold.
                    ['description' => 'مصد أمامي', 'part_code' => 'BUMPER_F', 'qty' => 1, 'unit_price' => 200000],
                    ['description' => 'عمالة', 'qty' => 1, 'unit_price' => 20000],
                ],
            ]);

        $response->assertCreated();

        $flags = collect($response->json('data.items'))->pluck('deviation_flag');
        $this->assertTrue($flags[0]);
        // A line with no part code has no reference to deviate from.
        $this->assertFalse($flags[1]);
    }
}
