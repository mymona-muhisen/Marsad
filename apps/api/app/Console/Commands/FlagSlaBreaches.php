<?php

namespace App\Console\Commands;

use App\Services\Claims\SlaBreachService;
use Illuminate\Console\Command;

class FlagSlaBreaches extends Command
{
    protected $signature = 'masar:flag-sla-breaches';

    protected $description = 'Log an sla_breached claim_event for claims past their SLA due date.';

    public function handle(SlaBreachService $service): int
    {
        $count = $service->flagBreaches();

        $this->info("Flagged {$count} SLA breach(es).");

        return self::SUCCESS;
    }
}
