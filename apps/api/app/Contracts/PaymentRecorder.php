<?php

namespace App\Contracts;

use App\Models\Settlement;
use App\Support\PaymentReceipt;

/**
 * The payout rail (CLAUDE.md rule #4).
 *
 * Doc 01 §A.4 lists stable payments infrastructure among the preconditions
 * Syria lacks — settlements are cash-dominant and happen outside the platform
 * today. `RecordOnlyPaymentRecorder` is therefore the manual-mode default: it
 * registers that a payout was authorised and moves nothing. Putting the call
 * behind this interface now is what lets a real rail be swapped in later
 * without touching `SettlementService`.
 */
interface PaymentRecorder
{
    /**
     * Register the payout for a settled claim.
     *
     * Implementations must be safe to call exactly once per settlement;
     * `SettlementService` guarantees that by rejecting a second settlement on
     * the same claim before this is reached.
     */
    public function record(Settlement $settlement): PaymentReceipt;
}
