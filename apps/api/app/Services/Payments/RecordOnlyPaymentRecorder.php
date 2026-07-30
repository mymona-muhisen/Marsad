<?php

namespace App\Services\Payments;

use App\Contracts\PaymentRecorder;
use App\Models\Settlement;
use App\Support\PaymentReceipt;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Manual-mode payout recorder: registers the payout, moves no money.
 *
 * This is the honest default for the pilot. A cash settlement is handed over
 * in person and a repair order is worked off at a workshop — in both cases the
 * platform's job is to say authoritatively that the insurer owes it, not to
 * transfer it. Swap the binding in `AppServiceProvider` for a real rail and
 * nothing at the call site changes.
 */
class RecordOnlyPaymentRecorder implements PaymentRecorder
{
    public function record(Settlement $settlement): PaymentReceipt
    {
        $receipt = new PaymentReceipt(
            // Deliberately not derived from the settlement's id: the reference
            // is surfaced on the claimant's timeline, and sequential ids do not
            // belong in anything a user can read (CLAUDE.md rule #10).
            reference: 'REC-'.now()->format('ymd').'-'.strtoupper(Str::random(6)),
            driver: 'record_only',
            recordedAt: now(),
            movedFunds: false,
        );

        Log::channel(config('services.payment_recorder.log_channel', 'stack'))->info(
            "[PAYOUT recorded] settlement={$settlement->id} claim={$settlement->claim_id} ".
            "mode={$settlement->mode->value} amount={$settlement->amount} ref={$receipt->reference}"
        );

        return $receipt;
    }
}
