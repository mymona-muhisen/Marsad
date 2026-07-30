<?php

namespace App\Support;

use Illuminate\Support\Carbon;

/**
 * What a payment rail hands back when a payout is registered.
 *
 * A real gateway returns a transaction id that must be kept; the record-only
 * driver returns one it minted itself. Callers treat both the same, which is
 * the point of the interface.
 */
final readonly class PaymentReceipt
{
    public function __construct(
        public string $reference,
        /** Which driver produced this — 'record_only' until a rail is wired. */
        public string $driver,
        public Carbon $recordedAt,
        /** False whenever the money moved outside the platform. */
        public bool $movedFunds = false,
    ) {}
}
