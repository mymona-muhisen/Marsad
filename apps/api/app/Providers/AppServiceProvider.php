<?php

namespace App\Providers;

use App\Contracts\SmsGateway;
use App\Services\Sms\LogSmsGateway;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(SmsGateway::class, match (config('services.sms.driver', 'log')) {
            // Only a log driver exists today (manual mode, CLAUDE.md rule #4);
            // a real carrier adapter is added here behind the same interface.
            default => LogSmsGateway::class,
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('otp-request', function (Request $request) {
            $key = 'otp-request:'.$request->input('phone');

            return Limit::perMinutes(
                config('otp.request_window_minutes'),
                config('otp.request_max_per_window'),
            )->by($key);
        });
    }
}
