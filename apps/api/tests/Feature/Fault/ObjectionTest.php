<?php

namespace Tests\Feature\Fault;

use App\Enums\CasePartyRole;
use App\Enums\CaseStatus;
use App\Enums\FaultDecisionStatus;
use App\Enums\ObjectionStatus;
use App\Enums\RoleName;
use App\Models\AccidentCase;
use App\Models\CaseParty;
use App\Models\FaultAllocation;
use App\Models\FaultDecision;
use App\Models\Report;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ObjectionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->seed(RoleSeeder::class);
    }

    private function seniorAdjudicator(): User
    {
        $user = User::factory()->create();
        $user->assignRole(RoleName::SeniorAdjudicator->value);

        return $user;
    }

    /**
     * @return array{0: AccidentCase, 1: CaseParty, 2: CaseParty, 3: FaultDecision}
     */
    private function decidedCase(): array
    {
        $case = AccidentCase::factory()->create(['status' => CaseStatus::ObjectionWindow->value]);
        $reporter = CaseParty::factory()->create([
            'case_id' => $case->id,
            'role' => CasePartyRole::Reporter->value,
            'user_id' => User::factory(),
        ]);
        $counterparty = CaseParty::factory()->counterparty()->create([
            'case_id' => $case->id,
            'user_id' => User::factory(),
        ]);

        $decision = FaultDecision::factory()->create(['case_id' => $case->id, 'decided_at' => now()->subHour()]);
        FaultAllocation::factory()->create(['decision_id' => $decision->id, 'party_id' => $reporter->id, 'percentage' => 0]);
        FaultAllocation::factory()->create(['decision_id' => $decision->id, 'party_id' => $counterparty->id, 'percentage' => 100]);

        Report::factory()->create(['case_id' => $case->id]);

        return [$case, $reporter, $counterparty, $decision];
    }

    public function test_a_case_party_can_object_within_the_72_hour_window(): void
    {
        [$case, $reporter] = $this->decidedCase();

        $response = $this->actingAs($reporter->user)->postJson("/api/v1/cases/{$case->case_no}/objections", [
            'reason' => 'لم آخذ حقي الكامل، كنت أملك حق الأولوية.',
        ]);

        $response->assertCreated()->assertJsonPath('data.status', ObjectionStatus::Open->value);

        $this->assertDatabaseHas('fault_decisions', ['case_id' => $case->id, 'status' => FaultDecisionStatus::Objected->value]);
    }

    public function test_objection_after_the_72_hour_window_is_rejected(): void
    {
        [$case, $reporter, $counterparty, $decision] = $this->decidedCase();
        $decision->forceFill(['decided_at' => now()->subHours(73)])->save();

        $this->actingAs($reporter->user)->postJson("/api/v1/cases/{$case->case_no}/objections", [
            'reason' => 'اعتراض متأخر',
        ])->assertUnprocessable();
    }

    public function test_a_party_cannot_object_twice(): void
    {
        [$case, $reporter] = $this->decidedCase();

        $this->actingAs($reporter->user)->postJson("/api/v1/cases/{$case->case_no}/objections", ['reason' => 'أولاً'])
            ->assertCreated();

        $this->actingAs($reporter->user)->postJson("/api/v1/cases/{$case->case_no}/objections", ['reason' => 'ثانياً'])
            ->assertUnprocessable();
    }

    public function test_a_non_party_cannot_object(): void
    {
        [$case] = $this->decidedCase();
        $intruder = User::factory()->create();

        $this->actingAs($intruder)->postJson("/api/v1/cases/{$case->case_no}/objections", ['reason' => 'test'])
            ->assertForbidden();
    }

    public function test_senior_adjudicator_dismissing_an_objection_finalizes_the_original_decision(): void
    {
        [$case, $reporter, $counterparty, $decision] = $this->decidedCase();
        $originalReport = Report::where('case_id', $case->id)->firstOrFail();

        $objectionResponse = $this->actingAs($reporter->user)->postJson("/api/v1/cases/{$case->case_no}/objections", [
            'reason' => 'اعتراض',
        ]);
        $objectionId = $objectionResponse->json('data.id');

        $response = $this->actingAs($this->seniorAdjudicator())->postJson("/api/v1/adjudication/objections/{$objectionId}/resolve", [
            'outcome' => 'dismiss',
            'resolution_note' => 'الأدلة تدعم القرار الأصلي.',
        ]);

        $response->assertOk()->assertJsonPath('data.status', ObjectionStatus::Dismissed->value);

        $this->assertDatabaseHas('accident_cases', ['id' => $case->id, 'status' => CaseStatus::Final->value]);
        $this->assertDatabaseHas('fault_decisions', ['id' => $decision->id, 'status' => FaultDecisionStatus::Final->value]);
        $this->assertDatabaseHas('reports', ['id' => $originalReport->id, 'status' => 'active']);
    }

    public function test_senior_adjudicator_upholding_an_objection_amends_the_decision_and_supersedes_the_report(): void
    {
        [$case, $reporter, $counterparty, $decision] = $this->decidedCase();
        $originalReport = Report::where('case_id', $case->id)->firstOrFail();

        $objectionResponse = $this->actingAs($reporter->user)->postJson("/api/v1/cases/{$case->case_no}/objections", [
            'reason' => 'اعتراض',
        ]);
        $objectionId = $objectionResponse->json('data.id');

        $response = $this->actingAs($this->seniorAdjudicator())->postJson("/api/v1/adjudication/objections/{$objectionId}/resolve", [
            'outcome' => 'uphold',
            'resolution_note' => 'تبين وجود مسؤولية مشتركة بعد المراجعة.',
            'amended_allocations' => [
                ['party_id' => $reporter->id, 'percentage' => 25],
                ['party_id' => $counterparty->id, 'percentage' => 75],
            ],
        ]);

        $response->assertOk()->assertJsonPath('data.status', ObjectionStatus::Upheld->value);

        $this->assertDatabaseHas('accident_cases', ['id' => $case->id, 'status' => CaseStatus::Final->value]);
        $this->assertDatabaseHas('fault_allocations', ['decision_id' => $decision->id, 'party_id' => $reporter->id, 'percentage' => 25]);
        $this->assertDatabaseHas('fault_allocations', ['decision_id' => $decision->id, 'party_id' => $counterparty->id, 'percentage' => 75]);

        $this->assertDatabaseHas('reports', ['id' => $originalReport->id, 'status' => 'superseded']);
        $newReport = Report::where('case_id', $case->id)->where('status', 'active')->firstOrFail();
        $this->assertDatabaseHas('reports', ['id' => $originalReport->id, 'superseded_by' => $newReport->id]);
    }
}
