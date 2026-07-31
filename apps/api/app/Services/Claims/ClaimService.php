<?php

namespace App\Services\Claims;

use App\Enums\ClaimDecisionOutcome;
use App\Enums\ClaimStatus;
use App\Models\AccidentCase;
use App\Models\Claim;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;

/**
 * FR-CL1: "claim auto-created for each not-at-fault party against at-fault
 * party's insurer upon final report." Pilot scope is exactly 2 parties
 * (doc 04 §2.3's case_parties UQ), so "the other party" is unambiguous.
 */
class ClaimService
{
    public function __construct(private readonly ClaimTimelineService $timeline) {}

    /**
     * @return list<Claim>
     */
    public function openClaimsForCase(AccidentCase $case): array
    {
        $decision = $case->faultDecision()->with('allocations.party.policy')->first();

        if (! $decision) {
            return [];
        }

        $parties = $case->parties()->with('policy')->get()->keyBy('id');
        $opened = [];

        foreach ($decision->allocations as $allocation) {
            if ($allocation->percentage >= 100) {
                continue; // fully at fault — no claim for this party
            }

            $claimant = $parties->get($allocation->party_id);
            $otherParty = $parties->first(fn ($party) => $party->id !== $allocation->party_id);

            if (! $claimant || ! $otherParty || ! $otherParty->policy_id) {
                continue; // no resolvable at-fault-party insurer to claim against
            }

            if (Claim::where('case_id', $case->id)->where('claimant_party_id', $claimant->id)->exists()) {
                continue; // already opened (e.g., re-dispatched event, defensive)
            }

            $claim = Claim::create([
                'case_id' => $case->id,
                'claimant_party_id' => $claimant->id,
                'insurer_org_id' => $otherParty->policy->insurer_org_id,
                'status' => ClaimStatus::Opened,
                'sla_due_at' => now()->addDays((int) config('claims.sla_days')),
            ]);

            $this->timeline->log($claim, null, 'opened');

            $opened[] = $claim;
        }

        return $opened;
    }

    public function decide(Claim $claim, User $agent, ClaimDecisionOutcome $outcome, string $reasonCode, ?string $note): Claim
    {
        if (in_array($claim->status, [ClaimStatus::Settled, ClaimStatus::Closed], true)) {
            throw ValidationException::withMessages([
                'claim' => ['هذه المطالبة مغلقة ولا يمكن اتخاذ قرار جديد بشأنها.'],
            ]);
        }

        $claim->forceFill(['status' => $outcome->claimStatus()])->save();

        $this->timeline->log($claim, $agent, 'decided', $reasonCode, $note);

        return $claim->refresh();
    }

    /**
     * @return Builder<Claim>
     */
    public function forOrganization(int $organizationId, ?ClaimStatus $status = null, bool $slaBreached = false): Builder
    {
        return Claim::query()
            ->where('insurer_org_id', $organizationId)
            ->when($status !== null, fn (Builder $q) => $q->where('status', $status))
            ->when($slaBreached, fn (Builder $q) => $q->where('sla_due_at', '<', now())
                ->whereNotIn('status', [ClaimStatus::Settled->value, ClaimStatus::Closed->value]));
    }

    /**
     * Claims an assessor office or workshop was actually put on.
     *
     * @return Builder<Claim>
     */
    public function forAssessor(User $user): Builder
    {
        return Claim::query()->where('assessor_org_id', $user->organization_id);
    }

    /**
     * @return Builder<Claim>
     */
    public function forClaimant(User $user): Builder
    {
        return Claim::query()->whereHas(
            'claimantParty',
            fn (Builder $q) => $q->where('user_id', $user->id),
        );
    }
}
