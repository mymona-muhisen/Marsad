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
use App\Models\InsurancePolicy;
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

    private User $citizen;

    private Organization $insurer;

    public function run(): void
    {
        $this->insurer = Organization::query()->where('type', OrganizationType::Insurer->value)->first()
            ?? Organization::factory()->create(['type' => OrganizationType::Insurer->value]);

        // Hang the fixtures off the fixed demo sign-ins rather than throwaway
        // factory users, so signing in as the demo citizen actually shows a
        // case in every lifecycle state instead of an empty list.
        $this->citizen = $this->demoUser(DemoUserSeeder::CITIZEN_PHONE)
            ?? User::factory()->create(['full_name' => 'مواطن تجريبي']);

        $adjudicator = $this->demoUser(DemoUserSeeder::ADJUDICATOR_PHONE);

        if (! $adjudicator) {
            $adjudicator = User::factory()->create(['full_name' => 'أحمد المحكّم']);
            $adjudicator->assignRole(RoleName::Adjudicator->value);
        }

        $this->adjudicatorId = $adjudicator->id;

        foreach (CaseStatus::cases() as $status) {
            $this->makeCaseInState($status);
        }

        foreach (ClaimStatus::cases() as $status) {
            $this->makeClaimInState($status, $this->insurer);
        }
    }

    /** Null when DemoUserSeeder has not run — the fixtures still work without it. */
    private function demoUser(string $phone): ?User
    {
        return User::query()->where('phone', $phone)->first();
    }

    /**
     * A verified, in-force policy for a demo vehicle.
     *
     * Without one the demo cannot show the chain the defense is built around:
     * `ClaimService::openClaimsForCase()` skips any party whose counterpart has
     * no `policy_id`, so a case reaching `final` opened no claim at all and the
     * only claims in the database were ones this seeder fabricated directly.
     */
    private function verifiedPolicy(Vehicle $vehicle): InsurancePolicy
    {
        return InsurancePolicy::factory()->verified()->create([
            'vehicle_id' => $vehicle->id,
            'insurer_org_id' => $this->insurer->id,
            'start_date' => now()->subMonths(6),
            'end_date' => now()->addMonths(6),
        ]);
    }

    private function makeCaseInState(CaseStatus $status): AccidentCase
    {
        $reporter = $this->citizen;
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
            'policy_id' => $this->verifiedPolicy($vehicle)->id,
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
            $counterpartyVehicle = Vehicle::factory()->create(['owner_id' => $counterparty->id]);
            $counterpartyParty = CaseParty::factory()->counterparty()->create([
                'case_id' => $case->id,
                'user_id' => $counterparty->id,
                'vehicle_id' => $counterpartyVehicle->id,
                // The at-fault side needs an insurer for a claim to open
                // against — this is what makes the demo chain reach a claim.
                'policy_id' => $this->verifiedPolicy($counterpartyVehicle)->id,
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
        $reporter = $this->citizen;
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
