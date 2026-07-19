<?php

namespace Tests\Feature\Registry;

use App\Enums\VerificationStatus;
use App\Models\InsurancePolicy;
use App\Services\Policy\PolicyExpiryReminderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PolicyExpiryReminderTest extends TestCase
{
    use RefreshDatabase;

    public function test_reminders_fire_only_on_exact_30_7_and_1_day_thresholds(): void
    {
        InsurancePolicy::factory()->expiringInDays(30)->create();
        InsurancePolicy::factory()->expiringInDays(7)->create();
        InsurancePolicy::factory()->expiringInDays(1)->create();
        InsurancePolicy::factory()->expiringInDays(29)->create();
        InsurancePolicy::factory()->expiringInDays(8)->create();
        InsurancePolicy::factory()->expiringInDays(2)->create();
        InsurancePolicy::factory()->expiringInDays(0)->create();

        $sent = $this->app->make(PolicyExpiryReminderService::class)->run();

        $this->assertSame(3, $sent);
        $this->assertDatabaseCount('notifications', 3);
    }

    public function test_only_verified_policies_receive_reminders(): void
    {
        InsurancePolicy::factory()->expiringInDays(7)->pending()->create();
        InsurancePolicy::factory()->expiringInDays(7)->create(['verification_status' => VerificationStatus::Rejected->value]);
        InsurancePolicy::factory()->expiringInDays(7)->create();

        $sent = $this->app->make(PolicyExpiryReminderService::class)->run();

        $this->assertSame(1, $sent);
    }

    public function test_running_twice_in_the_same_day_does_not_duplicate_reminders(): void
    {
        InsurancePolicy::factory()->expiringInDays(30)->create();

        $service = $this->app->make(PolicyExpiryReminderService::class);
        $service->run();
        $second = $service->run();

        $this->assertSame(0, $second);
        $this->assertDatabaseCount('notifications', 1);
    }
}
