<?php

namespace Database\Seeders;

use App\Enums\CasePartyRole;
use App\Enums\CaseStatus;
use App\Enums\CaseTrack;
use App\Enums\ClaimStatus;
use App\Enums\FaultDecisionStatus;
use App\Enums\OrganizationType;
use App\Enums\ReportStatus;
use App\Enums\RoleName;
use App\Models\AccidentCase;
use App\Models\CaseParty;
use App\Models\Claim;
use App\Models\FaultAllocation;
use App\Models\FaultDecision;
use App\Models\Organization;
use App\Models\Report;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Dev-only fixture (Sprint 7 task 4): one accident_cases row in every
 * lifecycle state, plus claims in every status — for frontend development
 * against realistic data. Built via direct model/factory creation, not the
 * real HTTP/service flow — this is fixture data, not a behavioral test.
 */
class DemoSeeder extends Seeder
{
    private int $adjudicatorId;

    public function run(): void
    {
        $insurer = Organization::query()->where('type', OrganizationType::Insurer->value)->first()
            ?? Organization::factory()->create(['type' => OrganizationType::Insurer->value]);

        $adjudicator = User::factory()->create(['full_name' => 'أحمد المحكّم']);
        $adjudicator->assignRole(RoleName::Adjudicator->value);
        $this->adjudicatorId = $adjudicator->id;

        foreach (CaseStatus::cases() as $status) {
            $this->makeCaseInState($status);
        }

        foreach (ClaimStatus::cases() as $status) {
            $this->makeClaimInState($status, $insurer);
        }
    }

    private function makeCaseInState(CaseStatus $status): AccidentCase
    {
        $reporter = User::factory()->create();
        $vehicle = Vehicle::factory()->create(['owner_id' => $reporter->id]);

        $noTrackYet = in_array($status, [CaseStatus::Draft, CaseStatus::Cancelled], true);

        $case = AccidentCase::factory()->create([
            'status' => $status->value,
            'track' => $noTrackYet ? null : CaseTrack::FastTrack->value,
            'reported_by' => $reporter->id,
        ]);

        $reporterParty = CaseParty::factory()->create([
            'case_id' => $case->id,
            'user_id' => $reporter->id,
            'vehicle_id' => $vehicle->id,
            'role' => CasePartyRole::Reporter->value,
        ]);

        $awaitsCounterparty = $status === CaseStatus::AwaitingCounterparty;
        $hasJoinedCounterparty = ! in_array($status, [
            CaseStatus::Draft, CaseStatus::Submitted, CaseStatus::UnderReview,
            CaseStatus::AwaitingCounterparty, CaseStatus::Cancelled, CaseStatus::Escalated,
        ], true);

        $counterpartyParty = null;

        if ($awaitsCounterparty) {
            $counterpartyParty = CaseParty::factory()->counterparty()->create([
                'case_id' => $case->id,
                'join_token' => Str::random(64),
                'join_token_expires_at' => now()->addHours(24),
            ]);
        } elseif ($hasJoinedCounterparty) {
            $counterparty = User::factory()->create();
            $counterpartyParty = CaseParty::factory()->counterparty()->create([
                'case_id' => $case->id,
                'user_id' => $counterparty->id,
                'joined_at' => now()->subDay(),
            ]);
        }

        $hasDecision = in_array($status, [
            CaseStatus::DecisionIssued, CaseStatus::ObjectionWindow, CaseStatus::Final, CaseStatus::Closed,
        ], true);

        if ($hasDecision) {
            $decisionFinal = in_array($status, [CaseStatus::Final, CaseStatus::Closed], true);

            $decision = FaultDecision::factory()->create([
                'case_id' => $case->id,
                'adjudicator_id' => $this->adjudicatorId,
                'status' => $decisionFinal ? FaultDecisionStatus::Final->value : FaultDecisionStatus::Confirmed->value,
            ]);

            FaultAllocation::factory()->create(['decision_id' => $decision->id, 'party_id' => $reporterParty->id, 'percentage' => 0]);
            FaultAllocation::factory()->create(['decision_id' => $decision->id, 'party_id' => $counterpartyParty->id, 'percentage' => 100]);

            Report::factory()->create([
                'case_id' => $case->id,
                'status' => ReportStatus::Active->value,
            ]);
        }

        return $case;
    }

    private function makeClaimInState(ClaimStatus $status, Organization $insurer): Claim
    {
        $reporter = User::factory()->create();
        $vehicle = Vehicle::factory()->create(['owner_id' => $reporter->id]);

        $case = AccidentCase::factory()->create([
            'status' => CaseStatus::Final->value,
            'track' => CaseTrack::FastTrack->value,
            'reported_by' => $reporter->id,
        ]);

        $claimantParty = CaseParty::factory()->create([
            'case_id' => $case->id,
            'user_id' => $reporter->id,
            'vehicle_id' => $vehicle->id,
            'role' => CasePartyRole::Reporter->value,
        ]);

        $isDone = in_array($status, [ClaimStatus::Settled, ClaimStatus::Closed], true);

        return Claim::factory()->create([
            'case_id' => $case->id,
            'claimant_party_id' => $claimantParty->id,
            'insurer_org_id' => $insurer->id,
            'status' => $status->value,
            'sla_due_at' => $isDone ? now()->subDay() : now()->addDays(3),
        ]);
    }
}
