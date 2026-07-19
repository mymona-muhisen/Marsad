<?php

namespace App\Services\Sms;

use App\Contracts\SmsGateway;
use Illuminate\Support\Facades\Log;

/**
 * Dev-mode SMS adapter (CLAUDE.md rule #4): logs instead of calling a real
 * carrier. Swap the binding in AppServiceProvider for a real gateway later.
 */
class LogSmsGateway implements SmsGateway
{
    public function send(string $phone, string $message): void
    {
        Log::channel(config('services.sms.log_channel', 'stack'))
            ->info("[SMS to {$phone}] {$message}");
    }
}
