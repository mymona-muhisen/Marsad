<?php

namespace App\Services\Claims;

use App\Contracts\PaymentRecorder;
use App\Enums\ClaimStatus;
use App\Enums\SettlementMode;
use App\Models\Claim;
use App\Models\Settlement;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * FR-CL5: "claim -> settled -> closed; SLA stops." Both status changes
 * happen in this single call — no separate "close claim" endpoint exists,
 * since nothing in doc 04/the sprint brief describes an intervening step
 * between settlement and closing.
 */
class SettlementService
{
    public function __construct(
        private readonly ClaimTimelineService $timeline,
        private readonly PaymentRecorder $payments,
    ) {}

    public function record(Claim $claim, User $agent, SettlementMode $mode, float $amount, ?int $workshopOrgId): Settlement
    {
        if (Settlement::where('claim_id', $claim->id)->exists()) {
            throw ValidationException::withMessages([
                'claim' => ['تمت تسوية هذه المطالبة مسبقاً.'],
            ]);
        }

        if ($mode === SettlementMode::RepairOrder && ! $workshopOrgId) {
            throw ValidationException::withMessages([
                'workshop_org_id' => ['ورشة الإصلاح مطلوبة عند اختيار أمر الإصلاح.'],
            ]);
        }

        $settlement = Settlement::create([
            'claim_id' => $claim->id,
            'mode' => $mode,
            'amount' => $amount,
            'workshop_org_id' => $mode === SettlementMode::RepairOrder ? $workshopOrgId : null,
            'settled_at' => now(),
        ]);

        // The payout goes through the adapter, never a vendor call inline
        // (CLAUDE.md rule #4). In record-only mode nothing is transferred —
        // the receipt states that the payout was authorised.
        $receipt = $this->payments->record($settlement);

        $claim->forceFill(['status' => ClaimStatus::Settled])->save();

        // The receipt lands on the append-only claim timeline rather than a new
        // column: doc 04 §2.5 already makes that the record of every mutation,
        // and it is what the claimant reads.
        $this->timeline->log(
            $claim,
            $agent,
            'settled',
            null,
            "مرجع الدفع: {$receipt->reference}",
        );

        $claim->forceFill(['status' => ClaimStatus::Closed])->save();
        $this->timeline->log($claim, $agent, 'closed');

        return $settlement;
    }
}
