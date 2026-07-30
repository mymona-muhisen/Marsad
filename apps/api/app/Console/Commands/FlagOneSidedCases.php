<?php

namespace App\Console\Commands;

use App\Services\Cases\OneSidedCaseFlaggingService;
use Illuminate\Console\Command;

class FlagOneSidedCases extends Command
{
    protected $signature = 'marsad:flag-one-sided-cases';

    protected $description = 'Flag cases whose counterparty never joined within 24h and advance them past awaiting_counterparty.';

    public function handle(OneSidedCaseFlaggingService $service): int
    {
        $count = $service->run();

        $this->info("Flagged {$count} one-sided case(s).");

        return self::SUCCESS;
    }
}
