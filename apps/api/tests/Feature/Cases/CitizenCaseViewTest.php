<?php

namespace Tests\Feature\Cases;

use App\Enums\CasePartyRole;
use App\Enums\CaseStatus;
use App\Models\AccidentCase;
use App\Models\CaseParty;
use App\Models\FaultAllocation;
use App\Models\FaultDecision;
use App\Models\LiabilityRule;
use App\Models\Report;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * The citizen case view (UC-04): the list of a user's own cases, and the
 * single-case payload that backs the timeline, decision card, and objection
 * countdown.
 */
class CitizenCaseViewTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->seed(RoleSeeder::class);
    }

    private function caseWithParty(User $user, string $status = CaseStatus::Submitted->value): AccidentCase
    {
        $case = AccidentCase::factory()->create(['status' => $status]);
        CaseParty::factory()->create([
            'case_id' => $case->id,
            'role' => CasePartyRole::Reporter->value,
            'user_id' => $user->id,
        ]);

        return $case;
    }

    public function test_index_returns_only_cases_the_caller_is_a_party_to(): void
    {
        $user = User::factory()->create();
        $mine = $this->caseWithParty($user);

        // Someone else's case, which must never appear.
        $this->caseWithParty(User::factory()->create());

        $response = $this->actingAs($user)->getJson('/api/v1/cases');

        $response->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame($mine->case_no, $response->json('data.0.case_no'));
    }

    public function test_index_never_exposes_a_sequential_id(): void
    {
        $user = User::factory()->create();
        $this->caseWithParty($user);

        $response = $this->actingAs($user)->getJson('/api/v1/cases');

        // CLAUDE.md rule 10 — case_no is the only identity a client sees.
        $this->assertArrayNotHasKey('id', $response->json('data.0'));
        $this->assertArrayHasKey('case_no', $response->json('data.0'));
    }

    public function test_index_rejects_an_unauthenticated_caller(): void
    {
        $this->getJson('/api/v1/cases')->assertUnauthorized();
    }

    public function test_show_rejects_a_user_who_is_not_a_party(): void
    {
        $stranger = User::factory()->create();
        $case = $this->caseWithParty(User::factory()->create());

        $this->actingAs($stranger)
            ->getJson("/api/v1/cases/{$case->case_no}")
            ->assertForbidden();
    }

    public function test_show_carries_the_decision_with_the_rule_it_cites(): void
    {
        $user = User::factory()->create();
        $case = $this->caseWithParty($user, CaseStatus::ObjectionWindow->value);
        $party = $case->parties()->firstOrFail();

        $rule = LiabilityRule::factory()->create([
            'description_ar' => 'الاصطدام من الخلف: المسؤولية كاملة على المركبة الخلفية.',
        ]);
        $decision = FaultDecision::factory()->create([
            'case_id' => $case->id,
            'rule_id' => $rule->id,
            'decided_at' => now()->subHours(2),
        ]);
        FaultAllocation::factory()->create([
            'decision_id' => $decision->id,
            'party_id' => $party->id,
            'percentage' => 25,
        ]);
        Report::factory()->create(['case_id' => $case->id]);

        $response = $this->actingAs($user)->getJson("/api/v1/cases/{$case->case_no}");

        $response->assertOk()
            ->assertJsonPath(
                'data.fault_decision.rule_description_ar',
                'الاصطدام من الخلف: المسؤولية كاملة على المركبة الخلفية.',
            )
            ->assertJsonPath('data.fault_decision.allocations.0.percentage', 25)
            ->assertJsonPath('data.fault_decision.objection_window_hours', 72);

        $this->assertNotEmpty($response->json('data.reports.0.report_no'));
    }

    public function test_objection_countdown_counts_down_from_the_server_clock(): void
    {
        $user = User::factory()->create();
        $case = $this->caseWithParty($user, CaseStatus::ObjectionWindow->value);

        FaultDecision::factory()->create([
            'case_id' => $case->id,
            'decided_at' => now()->subHours(2),
        ]);

        $remaining = $this->actingAs($user)
            ->getJson("/api/v1/cases/{$case->case_no}")
            ->json('data.fault_decision.objection_seconds_remaining');

        // 72h window, 2h elapsed — 70h left, allowing a second of drift.
        $this->assertEqualsWithDelta(70 * 3600, $remaining, 5);
    }

    public function test_countdown_is_zero_rather_than_negative_once_the_window_closes(): void
    {
        $user = User::factory()->create();
        $case = $this->caseWithParty($user, CaseStatus::ObjectionWindow->value);

        FaultDecision::factory()->create([
            'case_id' => $case->id,
            'decided_at' => now()->subHours(100),
        ]);

        $remaining = $this->actingAs($user)
            ->getJson("/api/v1/cases/{$case->case_no}")
            ->json('data.fault_decision.objection_seconds_remaining');

        $this->assertSame(0, $remaining);
    }

    public function test_a_case_without_a_decision_reports_no_decision(): void
    {
        $user = User::factory()->create();
        $case = $this->caseWithParty($user);

        $this->actingAs($user)
            ->getJson("/api/v1/cases/{$case->case_no}")
            ->assertOk()
            ->assertJsonPath('data.fault_decision', null);
    }
}
