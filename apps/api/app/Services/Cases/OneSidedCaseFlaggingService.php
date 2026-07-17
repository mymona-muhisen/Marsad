<?php

namespace App\Services\Cases;

use App\Enums\CaseStatus;
use App\Models\CaseParty;

/**
 * UC-01 ext. 7a: if the counterparty never joins within 24h, the case
 * proceeds one-sided — decision weight is noted later, in adjudication.
 */
class OneSidedCaseFlaggingService
{
    public function __construct(private readonly CaseLifecycleService $lifecycle) {}

    public function run(): int
    {
        $flagged = 0;

        $expiredParties = CaseParty::query()
            ->whereNotNull('join_token')
            ->where('join_token_expires_at', '<', now())
            ->whereHas('case', fn ($query) => $query->where('status', CaseStatus::AwaitingCounterparty->value))
            ->with('case')
            ->get();

        foreach ($expiredParties as $party) {
            $case = $party->case;

            $case->forceFill(['one_sided_flag' => true])->save();

            // Guarded, not unconditional: a dispatch_required case races
            // against DispatchService::complete() for the same transition
            // (App\Services\Cases\DispatchService) — whichever fires first
            // wins, this is a silent no-op if the surveyor already did.
            if ($this->lifecycle->canTransition($case, CaseStatus::EvidenceComplete)) {
                $this->lifecycle->transition($case, CaseStatus::EvidenceComplete);
            }

            $party->forceFill(['join_token' => null, 'join_token_expires_at' => null])->save();

            $flagged++;
        }

        return $flagged;
    }
}
