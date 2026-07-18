<?php

namespace App\Listeners;

use App\Events\CaseFinalized;
use App\Services\Claims\ClaimService;

class OpenClaimsForFinalizedCase
{
    public function __construct(private readonly ClaimService $claims) {}

    public function handle(CaseFinalized $event): void
    {
        $this->claims->openClaimsForCase($event->case);
    }
}
