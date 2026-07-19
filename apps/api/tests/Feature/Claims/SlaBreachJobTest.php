<?php

namespace Tests\Feature\Claims;

use App\Enums\ClaimStatus;
use App\Models\Claim;
use App\Models\ClaimEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SlaBreachJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_flags_claims_past_their_sla_due_date(): void
    {
        $breached = Claim::factory()->create(['sla_due_at' => now()->subDay(), 'status' => ClaimStatus::Opened->value]);
        $onTime = Claim::factory()->create(['sla_due_at' => now()->addDay(), 'status' => ClaimStatus::Opened->value]);

        $this->artisan('masar:flag-sla-breaches')->assertSuccessful();

        $this->assertDatabaseHas('claim_events', ['claim_id' => $breached->id, 'action' => 'sla_breached']);
        $this->assertDatabaseMissing('claim_events', ['claim_id' => $onTime->id, 'action' => 'sla_breached']);
    }

    public function test_does_not_flag_settled_or_closed_claims(): void
    {
        $settled = Claim::factory()->create(['sla_due_at' => now()->subDay(), 'status' => ClaimStatus::Settled->value]);
        $closed = Claim::factory()->create(['sla_due_at' => now()->subDay(), 'status' => ClaimStatus::Closed->value]);

        $this->artisan('masar:flag-sla-breaches')->assertSuccessful();

        $this->assertDatabaseMissing('claim_events', ['claim_id' => $settled->id, 'action' => 'sla_breached']);
        $this->assertDatabaseMissing('claim_events', ['claim_id' => $closed->id, 'action' => 'sla_breached']);
    }

    public function test_running_twice_does_not_duplicate_the_breach_event(): void
    {
        $claim = Claim::factory()->create(['sla_due_at' => now()->subDay(), 'status' => ClaimStatus::Opened->value]);

        $this->artisan('masar:flag-sla-breaches')->assertSuccessful();
        $this->artisan('masar:flag-sla-breaches')->assertSuccessful();

        $this->assertSame(1, ClaimEvent::where('claim_id', $claim->id)->where('action', 'sla_breached')->count());
    }
}
