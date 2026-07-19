<?php

namespace App\Console\Commands;

use App\Services\Policy\PolicyExpiryReminderService;
use Illuminate\Console\Command;

class SendPolicyExpiryReminders extends Command
{
    protected $signature = 'masar:policy-expiry-reminders';

    protected $description = 'Send SMS/notification reminders for policies expiring in 30/7/1 days.';

    public function handle(PolicyExpiryReminderService $reminders): int
    {
        $count = $reminders->run();

        $this->info("Sent {$count} policy expiry reminder(s).");

        return self::SUCCESS;
    }
}
