<?php

namespace Tests\Feature\Claims;

use App\Enums\CasePartyRole;
use App\Enums\ClaimStatus;
use App\Models\AccidentCase;
use App\Models\CaseParty;
use App\Models\Claim;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The claimant's own claim list and the SLA figures the tracking screen shows.
 */
class ClaimantClaimListTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    private function claimFor(User $user, array $overrides = []): Claim
    {
        $case = AccidentCase::factory()->create();
        $party = CaseParty::factory()->create([
            'case_id' => $case->id,
            'role' => CasePartyRole::Reporter->value,
            'user_id' => $user->id,
        ]);

        return Claim::factory()->create(array_merge([
            'case_id' => $case->id,
            'claimant_party_id' => $party->id,
        ], $overrides));
    }

    public function test_index_returns_only_the_callers_claims(): void
    {
        $user = User::factory()->create();
        $mine = $this->claimFor($user);
        $this->claimFor(User::factory()->create());

        $response = $this->actingAs($user)->getJson('/api/v1/claims');

        $response->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame($mine->id, $response->json('data.0.id'));
    }

    public function test_index_rejects_an_unauthenticated_caller(): void
    {
        $this->getJson('/api/v1/claims')->assertUnauthorized();
    }

    public function test_index_carries_the_case_number_for_linking_back(): void
    {
        $user = User::factory()->create();
        $claim = $this->claimFor($user);

        $response = $this->actingAs($user)->getJson('/api/v1/claims');

        $response->assertOk()->assertJsonPath(
            'data.0.case_no',
            $claim->case->case_no,
        );
    }

    public function test_sla_countdown_is_computed_on_the_server(): void
    {
        $user = User::factory()->create();
        $this->claimFor($user, ['sla_due_at' => now()->addHours(30)]);

        $remaining = $this->actingAs($user)
            ->getJson('/api/v1/claims')
            ->json('data.0.sla_seconds_remaining');

        $this->assertEqualsWithDelta(30 * 3600, $remaining, 5);
    }

    public function test_an_overdue_open_claim_is_flagged_as_breached(): void
    {
        $user = User::factory()->create();
        $this->claimFor($user, [
            'sla_due_at' => now()->subHours(6),
            'status' => ClaimStatus::Assessing->value,
        ]);

        $response = $this->actingAs($user)->getJson('/api/v1/claims');

        $response->assertOk()->assertJsonPath('data.0.sla_breached', true);
        // Negative, not floored — how far overdue the insurer is matters here.
        $this->assertLessThan(0, $response->json('data.0.sla_seconds_remaining'));
    }

    public function test_a_settled_claim_past_its_deadline_is_not_a_breach(): void
    {
        $user = User::factory()->create();
        $this->claimFor($user, [
            'sla_due_at' => now()->subDays(3),
            'status' => ClaimStatus::Settled->value,
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/claims')
            ->assertOk()
            ->assertJsonPath('data.0.sla_breached', false);
    }

    public function test_show_refuses_a_claim_belonging_to_someone_else(): void
    {
        $claim = $this->claimFor(User::factory()->create());

        $this->actingAs(User::factory()->create())
            ->getJson("/api/v1/claims/{$claim->id}")
            ->assertForbidden();
    }

    public function test_show_returns_the_event_timeline(): void
    {
        $user = User::factory()->create();
        $claim = $this->claimFor($user);
        $claim->events()->create(['action' => 'opened']);

        $this->actingAs($user)
            ->getJson("/api/v1/claims/{$claim->id}")
            ->assertOk()
            ->assertJsonPath('data.events.0.action', 'opened');
    }
}
