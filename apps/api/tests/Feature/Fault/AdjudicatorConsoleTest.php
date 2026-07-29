<?php

namespace Tests\Feature\Fault;

use App\Enums\CasePartyRole;
use App\Enums\CaseStatus;
use App\Enums\RoleName;
use App\Models\AccidentCase;
use App\Models\CaseParty;
use App\Models\LiabilityRule;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * What the adjudicator console needs beyond the decide endpoint: the ability
 * to open a case it is reviewing, and the matrix that backs its proposal card.
 */
class AdjudicatorConsoleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->seed(RoleSeeder::class);
    }

    private function userWithRole(RoleName $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role->value);

        return $user;
    }

    private function reviewableCase(): AccidentCase
    {
        $case = AccidentCase::factory()->create([
            'status' => CaseStatus::EvidenceComplete->value,
        ]);

        CaseParty::factory()->create([
            'case_id' => $case->id,
            'role' => CasePartyRole::Reporter->value,
            'user_id' => User::factory(),
            'statement_text' => 'كنت أسير في المسار الأيمن حين صدمتني المركبة من الخلف.',
        ]);
        CaseParty::factory()->counterparty()->create([
            'case_id' => $case->id,
            'user_id' => User::factory(),
            'statement_text' => 'توقّفت المركبة أمامي فجأة دون سبب.',
        ]);

        return $case;
    }

    public function test_an_adjudicator_can_open_a_case_they_are_not_a_party_to(): void
    {
        // The queue lists these; before this, opening one answered 403.
        $case = $this->reviewableCase();

        $this->actingAs($this->userWithRole(RoleName::Adjudicator))
            ->getJson("/api/v1/cases/{$case->case_no}")
            ->assertOk()
            ->assertJsonPath('data.case_no', $case->case_no)
            ->assertJsonCount(2, 'data.parties');
    }

    public function test_a_senior_adjudicator_can_open_a_case_for_an_appeal(): void
    {
        $case = $this->reviewableCase();

        $this->actingAs($this->userWithRole(RoleName::SeniorAdjudicator))
            ->getJson("/api/v1/cases/{$case->case_no}")
            ->assertOk();
    }

    public function test_the_grant_does_not_extend_to_other_back_office_roles(): void
    {
        $case = $this->reviewableCase();

        // A surveyor reaches their cases through dispatch, an insurer through
        // the claim — neither gets a blanket read on every accident.
        foreach ([RoleName::Surveyor, RoleName::InsurerAgent, RoleName::Regulator] as $role) {
            $this->actingAs($this->userWithRole($role))
                ->getJson("/api/v1/cases/{$case->case_no}")
                ->assertForbidden();
        }
    }

    public function test_a_citizen_still_only_sees_their_own_cases(): void
    {
        $case = $this->reviewableCase();

        $this->actingAs($this->userWithRole(RoleName::Citizen))
            ->getJson("/api/v1/cases/{$case->case_no}")
            ->assertForbidden();
    }

    public function test_the_queue_carries_the_parties_each_row_displays(): void
    {
        $this->reviewableCase();

        $this->actingAs($this->userWithRole(RoleName::Adjudicator))
            ->getJson('/api/v1/adjudication/queue')
            ->assertOk()
            ->assertJsonCount(2, 'data.0.parties');
    }

    public function test_liability_rules_returns_only_the_current_version_of_each_scenario(): void
    {
        LiabilityRule::factory()->create([
            'scenario_code' => 'REAR_END',
            'version' => 1,
            'fault_split_a' => 80,
            'fault_split_b' => 20,
            'effective_to' => now()->subDay(),
        ]);
        LiabilityRule::factory()->create([
            'scenario_code' => 'REAR_END',
            'version' => 2,
            'fault_split_a' => 100,
            'fault_split_b' => 0,
            'effective_to' => null,
        ]);

        $response = $this->actingAs($this->userWithRole(RoleName::Adjudicator))
            ->getJson('/api/v1/liability-rules');

        $response->assertOk();

        $rearEnd = collect($response->json('data'))
            ->where('scenario_code', 'REAR_END');

        // Superseded versions must never be offered as a proposal.
        $this->assertCount(1, $rearEnd);
        $this->assertSame(2, $rearEnd->first()['version']);
        $this->assertSame(100, $rearEnd->first()['fault_split_a']);
    }

    public function test_liability_rules_is_closed_to_roles_that_do_not_adjudicate(): void
    {
        $this->actingAs($this->userWithRole(RoleName::Citizen))
            ->getJson('/api/v1/liability-rules')
            ->assertForbidden();
    }

    public function test_liability_rules_requires_authentication(): void
    {
        $this->getJson('/api/v1/liability-rules')->assertUnauthorized();
    }
}
