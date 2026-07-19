<?php

namespace Tests\Feature\Fault;

use App\Enums\CasePartyRole;
use App\Enums\CaseStatus;
use App\Enums\RoleName;
use App\Models\AccidentCase;
use App\Models\CaseParty;
use App\Models\LiabilityRule;
use App\Models\User;
use App\Services\Fault\FaultDecisionService;
use Database\Seeders\LiabilityRuleSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class FaultDecisionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->seed(RoleSeeder::class);
        $this->seed(LiabilityRuleSeeder::class);
    }

    private function adjudicator(): User
    {
        $user = User::factory()->create();
        $user->assignRole(RoleName::Adjudicator->value);

        return $user;
    }

    /**
     * @return array{0: AccidentCase, 1: CaseParty, 2: CaseParty}
     */
    private function evidenceCompleteCaseWithParties(): array
    {
        $case = AccidentCase::factory()->create(['status' => CaseStatus::EvidenceComplete->value]);
        $reporter = CaseParty::factory()->create(['case_id' => $case->id, 'role' => CasePartyRole::Reporter->value]);
        $counterparty = CaseParty::factory()->counterparty()->create(['case_id' => $case->id]);

        return [$case, $reporter, $counterparty];
    }

    public function test_deciding_with_a_matching_rule_split_is_not_flagged_as_overridden(): void
    {
        [$case, $reporter, $counterparty] = $this->evidenceCompleteCaseWithParties();

        $response = $this->actingAs($this->adjudicator())->postJson("/api/v1/adjudication/cases/{$case->case_no}/decide", [
            'scenario_code' => 'REAR_END',
            'allocations' => [
                ['party_id' => $reporter->id, 'percentage' => 0],
                ['party_id' => $counterparty->id, 'percentage' => 100],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.was_overridden', false)
            ->assertJsonPath('data.status', 'confirmed');

        $this->assertDatabaseHas('accident_cases', ['id' => $case->id, 'status' => CaseStatus::ObjectionWindow->value]);
        $this->assertDatabaseCount('reports', 1);
    }

    public function test_deviating_from_the_rule_split_requires_justification(): void
    {
        [$case, $reporter, $counterparty] = $this->evidenceCompleteCaseWithParties();

        $this->actingAs($this->adjudicator())->postJson("/api/v1/adjudication/cases/{$case->case_no}/decide", [
            'scenario_code' => 'REAR_END',
            'allocations' => [
                ['party_id' => $reporter->id, 'percentage' => 50],
                ['party_id' => $counterparty->id, 'percentage' => 50],
            ],
        ])->assertUnprocessable()->assertJsonValidationErrors('justification');

        $this->actingAs($this->adjudicator())->postJson("/api/v1/adjudication/cases/{$case->case_no}/decide", [
            'scenario_code' => 'REAR_END',
            'allocations' => [
                ['party_id' => $reporter->id, 'percentage' => 50],
                ['party_id' => $counterparty->id, 'percentage' => 50],
            ],
            'justification' => 'الأدلة تشير إلى مسؤولية مشتركة رغم اقتراح القاعدة.',
        ])->assertCreated()->assertJsonPath('data.was_overridden', true);
    }

    public function test_manual_scenario_requires_justification_and_has_no_rule_id(): void
    {
        [$case, $reporter, $counterparty] = $this->evidenceCompleteCaseWithParties();

        $this->actingAs($this->adjudicator())->postJson("/api/v1/adjudication/cases/{$case->case_no}/decide", [
            'allocations' => [
                ['party_id' => $reporter->id, 'percentage' => 60],
                ['party_id' => $counterparty->id, 'percentage' => 40],
            ],
        ])->assertUnprocessable()->assertJsonValidationErrors('justification');

        $response = $this->actingAs($this->adjudicator())->postJson("/api/v1/adjudication/cases/{$case->case_no}/decide", [
            'allocations' => [
                ['party_id' => $reporter->id, 'percentage' => 60],
                ['party_id' => $counterparty->id, 'percentage' => 40],
            ],
            'justification' => 'حالة غير نمطية لا تطابق أي سيناريو مصنف.',
        ]);

        $response->assertCreated()->assertJsonPath('data.rule_id', null);
    }

    public function test_allocations_not_summing_to_100_are_rejected_by_the_service(): void
    {
        [$case, $reporter, $counterparty] = $this->evidenceCompleteCaseWithParties();

        $this->expectException(ValidationException::class);

        $this->app->make(FaultDecisionService::class)->decide(
            $case,
            $this->adjudicator(),
            null,
            [
                ['party_id' => $reporter->id, 'percentage' => 60],
                ['party_id' => $counterparty->id, 'percentage' => 60],
            ],
            'test',
        );
    }

    public function test_a_case_cannot_be_decided_twice(): void
    {
        [$case, $reporter, $counterparty] = $this->evidenceCompleteCaseWithParties();
        $adjudicator = $this->adjudicator();

        $this->actingAs($adjudicator)->postJson("/api/v1/adjudication/cases/{$case->case_no}/decide", [
            'scenario_code' => 'REAR_END',
            'allocations' => [
                ['party_id' => $reporter->id, 'percentage' => 0],
                ['party_id' => $counterparty->id, 'percentage' => 100],
            ],
        ])->assertCreated();

        $this->actingAs($adjudicator)->postJson("/api/v1/adjudication/cases/{$case->case_no}/decide", [
            'scenario_code' => 'REAR_END',
            'allocations' => [
                ['party_id' => $reporter->id, 'percentage' => 0],
                ['party_id' => $counterparty->id, 'percentage' => 100],
            ],
        ])->assertUnprocessable();
    }

    public function test_matrix_versioning_keeps_the_old_decision_pinned_to_its_original_rule_version(): void
    {
        [$case, $reporter, $counterparty] = $this->evidenceCompleteCaseWithParties();

        $v1 = LiabilityRule::where('scenario_code', 'REAR_END')->where('version', 1)->firstOrFail();

        $this->actingAs($this->adjudicator())->postJson("/api/v1/adjudication/cases/{$case->case_no}/decide", [
            'scenario_code' => 'REAR_END',
            'allocations' => [
                ['party_id' => $reporter->id, 'percentage' => 0],
                ['party_id' => $counterparty->id, 'percentage' => 100],
            ],
        ])->assertCreated();

        // A new rule version is published later (e.g., an admin edits the matrix).
        $v1->forceFill(['effective_to' => now()->toDateString()])->save();
        LiabilityRule::create([
            'scenario_code' => 'REAR_END',
            'description_ar' => 'نسخة محدثة من القاعدة.',
            'fault_split_a' => 90,
            'fault_split_b' => 10,
            'version' => 2,
            'effective_from' => now()->toDateString(),
            'effective_to' => null,
        ]);

        $this->assertDatabaseHas('fault_decisions', ['case_id' => $case->id, 'rule_id' => $v1->id]);
    }
}
