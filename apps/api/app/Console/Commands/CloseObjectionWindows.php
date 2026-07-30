<?php

namespace App\Console\Commands;

use App\Services\Fault\ObjectionWindowService;
use Illuminate\Console\Command;

class CloseObjectionWindows extends Command
{
    protected $signature = 'marsad:close-objection-windows';

    protected $description = 'Finalize fault decisions whose 72h objection window expired with no objection.';

    public function handle(ObjectionWindowService $service): int
    {
        $count = $service->closeExpiredWindows();

        $this->info("Closed {$count} objection window(s).");

        return self::SUCCESS;
    }
}
