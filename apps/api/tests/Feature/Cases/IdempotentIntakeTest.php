<?php

namespace Tests\Feature\Cases;

use App\Contracts\SmsGateway;
use App\Models\AccidentCase;
use App\Models\CaseParty;
use App\Models\EvidenceItem;
use App\Models\User;
use App\Models\Vehicle;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\Doubles\FakeSmsGateway;
use Tests\Support\FakesPhotos;
use Tests\TestCase;

/**
 * The offline-tolerance contract, end to end.
 *
 * Sprint 4 gave `evidence_items` an idempotency key, but that only dedups
 * *within* a case — it cannot help the intake, where a retry creates a whole
 * new case and the keys land on it harmlessly. The duplicate a citizen on a bad
 * connection actually causes is a duplicate accident, which needs a key on the
 * case itself.
 */
class IdempotentIntakeTest extends TestCase
{
    use FakesPhotos, RefreshDatabase;

    private FakeSmsGateway $sms;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->sms = new FakeSmsGateway;
        $this->app->instance(SmsGateway::class, $this->sms);
        $this->seed(RoleSeeder::class);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(Vehicle $vehicle, array $overrides = []): array
    {
        return array_merge([
            'vehicle_id' => $vehicle->id,
            'occurred_at' => now()->subMinutes(20)->toISOString(),
            'lat' => 33.5138,
            'lng' => 36.2765,
            'injury_flag' => false,
            'statement' => 'اصطدمت بي المركبة من الخلف.',
            'photos' => $this->fourPhotos('r'),
            'counterparty_phone' => '0922222222',
        ], $overrides);
    }

    public function test_a_retried_report_returns_the_original_case(): void
    {
        $reporter = User::factory()->create(['phone' => '0911111111']);
        $vehicle = Vehicle::factory()->create(['owner_id' => $reporter->id]);
        $key = (string) Str::uuid();

        $first = $this->actingAs($reporter)
            ->postJson('/api/v1/cases', $this->payload($vehicle, ['idempotency_key' => $key]))
            ->assertCreated();

        // The dropped-connection retry: identical request, same key.
        $second = $this->actingAs($reporter)
            ->postJson('/api/v1/cases', $this->payload($vehicle, ['idempotency_key' => $key]))
            ->assertCreated();

        $this->assertSame(
            $first->json('data.case_no'),
            $second->json('data.case_no'),
        );
        $this->assertSame(1, AccidentCase::count());
    }

    public function test_a_replay_does_not_text_the_counterparty_twice(): void
    {
        $reporter = User::factory()->create(['phone' => '0911111112']);
        $vehicle = Vehicle::factory()->create(['owner_id' => $reporter->id]);
        $key = (string) Str::uuid();

        $this->actingAs($reporter)
            ->postJson('/api/v1/cases', $this->payload($vehicle, ['idempotency_key' => $key]))
            ->assertCreated();

        $afterFirst = count($this->sms->sent);

        $this->actingAs($reporter)
            ->postJson('/api/v1/cases', $this->payload($vehicle, ['idempotency_key' => $key]))
            ->assertCreated();

        // Being invited twice to the same accident is alarming, not just noisy.
        $this->assertCount($afterFirst, $this->sms->sent);
    }

    public function test_a_replay_does_not_duplicate_the_evidence(): void
    {
        $reporter = User::factory()->create(['phone' => '0911111113']);
        $vehicle = Vehicle::factory()->create(['owner_id' => $reporter->id]);
        $key = (string) Str::uuid();

        foreach (range(1, 2) as $ignored) {
            $this->actingAs($reporter)
                ->postJson('/api/v1/cases', $this->payload($vehicle, ['idempotency_key' => $key]))
                ->assertCreated();
        }

        $this->assertSame(4, EvidenceItem::count());
    }

    public function test_two_genuine_reports_are_not_collapsed(): void
    {
        $reporter = User::factory()->create(['phone' => '0911111114']);
        $vehicle = Vehicle::factory()->create(['owner_id' => $reporter->id]);

        foreach ([Str::uuid(), Str::uuid()] as $key) {
            $this->actingAs($reporter)
                ->postJson('/api/v1/cases', $this->payload($vehicle, ['idempotency_key' => (string) $key]))
                ->assertCreated();
        }

        // A second accident on the same day is a real thing that happens.
        $this->assertSame(2, AccidentCase::count());
    }

    public function test_the_key_is_scoped_to_the_reporter(): void
    {
        $key = (string) Str::uuid();

        foreach (['0911111115', '0911111116'] as $phone) {
            $reporter = User::factory()->create(['phone' => $phone]);
            $vehicle = Vehicle::factory()->create(['owner_id' => $reporter->id]);

            $this->actingAs($reporter)
                ->postJson('/api/v1/cases', $this->payload($vehicle, ['idempotency_key' => $key]))
                ->assertCreated();
        }

        // One client's key must never be able to swallow another's report.
        $this->assertSame(2, AccidentCase::count());
    }

    public function test_a_report_without_a_key_still_works(): void
    {
        $reporter = User::factory()->create(['phone' => '0911111117']);
        $vehicle = Vehicle::factory()->create(['owner_id' => $reporter->id]);

        $this->actingAs($reporter)
            ->postJson('/api/v1/cases', $this->payload($vehicle))
            ->assertCreated();

        $this->assertNull(AccidentCase::first()->idempotency_key);
    }

    public function test_a_malformed_key_is_rejected_rather_than_stored(): void
    {
        $reporter = User::factory()->create(['phone' => '0911111118']);
        $vehicle = Vehicle::factory()->create(['owner_id' => $reporter->id]);

        $this->actingAs($reporter)
            ->postJson('/api/v1/cases', $this->payload($vehicle, ['idempotency_key' => 'not-a-uuid']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('idempotency_key');
    }

    public function test_a_retried_counterparty_join_does_not_duplicate_evidence(): void
    {
        $reporter = User::factory()->create(['phone' => '0911111119']);
        $vehicle = Vehicle::factory()->create(['owner_id' => $reporter->id]);

        $this->actingAs($reporter)
            ->postJson('/api/v1/cases', $this->payload($vehicle))
            ->assertCreated();

        $party = CaseParty::where('unregistered_phone', '0922222222')->firstOrFail();
        $counterparty = User::factory()->create(['phone' => '0922222222']);
        $keys = [(string) Str::uuid(), (string) Str::uuid(), (string) Str::uuid(), (string) Str::uuid()];

        $before = EvidenceItem::count();

        foreach (range(1, 2) as $ignored) {
            $this->actingAs($counterparty)
                ->postJson("/api/v1/cases/join/{$party->join_token}", [
                    'statement' => 'كنت أسير في مساري النظامي.',
                    'photos' => $this->fourPhotos('c'),
                    'idempotency_keys' => $keys,
                ]);
        }

        // The case already exists here, so the evidence-level key is enough.
        $this->assertSame($before + 4, EvidenceItem::count());
    }
}
