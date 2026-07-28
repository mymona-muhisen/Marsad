<?php

namespace App\Providers;

use App\Contracts\PolicyVerifier;
use App\Contracts\SmsGateway;
use App\Events\CaseFinalized;
use App\Listeners\OpenClaimsForFinalizedCase;
use App\Models\Claim;
use App\Models\FaultDecision;
use App\Observers\AuditObserver;
use App\Services\Policy\ManualPolicyVerifier;
use App\Services\Sms\LogSmsGateway;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
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

        $this->app->bind(PolicyVerifier::class, match (config('services.policy_verifier.driver', 'manual')) {
            // Manual mode only (FR-R3); an "api" driver is added here when an
            // insurer exposes a real verification API.
            default => ManualPolicyVerifier::class,
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

        // General per-route-group throttle for every authenticated endpoint
        // (Sprint 7 hardening); stricter named/inline limiters above still
        // apply on top of this where they're more specific.
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        Event::listen(CaseFinalized::class, OpenClaimsForFinalizedCase::class);

        // Privileged mutations (CLAUDE.md rule #9): fault decisions and
        // claim decisions. AuditObserver silently skips unauthenticated
        // (system-triggered) mutations — see its docblock.
        FaultDecision::observe(AuditObserver::class);
        Claim::observe(AuditObserver::class);

        if (! $this->app->isProduction()) {
            // N+1 audit (Sprint 7 hardening): lazy loading throws instead of
            // silently firing an extra query in dev/test.
            Model::preventLazyLoading();
        }
    }
}
