<?php

namespace Tests\Feature\Fault;

use App\Enums\CasePartyRole;
use App\Enums\CaseStatus;
use App\Enums\FaultDecisionStatus;
use App\Models\AccidentCase;
use App\Models\CaseParty;
use App\Models\FaultAllocation;
use App\Models\FaultDecision;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ObjectionWindowClosingTest extends TestCase
{
    use RefreshDatabase;

    public function test_expired_windows_with_no_objection_are_finalized(): void
    {
        Storage::fake('public');

        $case = AccidentCase::factory()->create(['status' => CaseStatus::ObjectionWindow->value]);
        $reporter = CaseParty::factory()->create(['case_id' => $case->id, 'role' => CasePartyRole::Reporter->value]);
        $counterparty = CaseParty::factory()->counterparty()->create(['case_id' => $case->id]);
        $decision = FaultDecision::factory()->create(['case_id' => $case->id, 'decided_at' => now()->subHours(73)]);
        FaultAllocation::factory()->create(['decision_id' => $decision->id, 'party_id' => $reporter->id, 'percentage' => 0]);
        FaultAllocation::factory()->create(['decision_id' => $decision->id, 'party_id' => $counterparty->id, 'percentage' => 100]);

        $this->artisan('marsad:close-objection-windows')->assertSuccessful();

        $this->assertDatabaseHas('fault_decisions', ['id' => $decision->id, 'status' => FaultDecisionStatus::Final->value]);
        $this->assertDatabaseHas('accident_cases', ['id' => $case->id, 'status' => CaseStatus::Final->value]);
    }

    public function test_windows_still_within_72_hours_are_not_closed(): void
    {
        $case = AccidentCase::factory()->create(['status' => CaseStatus::ObjectionWindow->value]);
        $decision = FaultDecision::factory()->create(['case_id' => $case->id, 'decided_at' => now()->subHours(10)]);

        $this->artisan('marsad:close-objection-windows')->assertSuccessful();

        $this->assertDatabaseHas('fault_decisions', ['id' => $decision->id, 'status' => FaultDecisionStatus::Confirmed->value]);
        $this->assertDatabaseHas('accident_cases', ['id' => $case->id, 'status' => CaseStatus::ObjectionWindow->value]);
    }
}
