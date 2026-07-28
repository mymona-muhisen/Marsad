<?php

namespace Tests\Unit\Services\Sms;

use App\Services\Sms\LogSmsGateway;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class LogSmsGatewayTest extends TestCase
{
    public function test_send_writes_the_phone_and_message_to_the_configured_log_channel(): void
    {
        Log::shouldReceive('channel')
            ->once()
            ->with('stack')
            ->andReturnSelf();

        Log::shouldReceive('info')
            ->once()
            ->with('[SMS to 0911111111] رمز التحقق: 123456');

        (new LogSmsGateway)->send('0911111111', 'رمز التحقق: 123456');
    }
}
