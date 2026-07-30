<?php

namespace Tests\Doubles;

use App\Contracts\PaymentRecorder;
use App\Models\Settlement;
use App\Support\PaymentReceipt;

class FakePaymentRecorder implements PaymentRecorder
{
    /** @var array<int, Settlement> */
    public array $recorded = [];

    public function __construct(private readonly string $reference = 'REC-TEST-000001') {}

    public function record(Settlement $settlement): PaymentReceipt
    {
        $this->recorded[] = $settlement;

        return new PaymentReceipt(
            reference: $this->reference,
            driver: 'fake',
            recordedAt: now(),
            movedFunds: false,
        );
    }
}
