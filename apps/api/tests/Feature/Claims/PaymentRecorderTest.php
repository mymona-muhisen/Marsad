<?php

namespace Tests\Feature\Claims;

use App\Contracts\PaymentRecorder;
use App\Enums\CasePartyRole;
use App\Enums\CaseStatus;
use App\Enums\OrganizationType;
use App\Enums\RoleName;
use App\Models\AccidentCase;
use App\Models\CaseParty;
use App\Models\Claim;
use App\Models\ClaimEvent;
use App\Models\Organization;
use App\Models\Settlement;
use App\Models\User;
use App\Services\Payments\RecordOnlyPaymentRecorder;
use Database\Seeders\OrganizationSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Tests\Doubles\FakePaymentRecorder;
use Tests\TestCase;

/**
 * The payout adapter (CLAUDE.md rule #4).
 *
 * The rule names three adapters — SmsGateway, PolicyVerifier, PaymentRecorder —
 * and only the first two existed; settlements wrote straight to the database
 * with no seam for a real payment rail.
 */
class PaymentRecorderTest extends TestCase
{
    use RefreshDatabase;

    private Organization $insurer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(OrganizationSeeder::class);

        $this->insurer = Organization::where('type', OrganizationType::Insurer->value)->firstOrFail();
    }

    private function agent(): User
    {
        $user = User::factory()->create(['organization_id' => $this->insurer->id]);
        $user->assignRole(RoleName::InsurerAgent->value);

        return $user;
    }

    private function claim(): Claim
    {
        $case = AccidentCase::factory()->create(['status' => CaseStatus::Final->value]);
        $party = CaseParty::factory()->create([
            'case_id' => $case->id,
            'role' => CasePartyRole::Reporter->value,
            'user_id' => User::factory(),
        ]);

        return Claim::factory()->create([
            'case_id' => $case->id,
            'claimant_party_id' => $party->id,
            'insurer_org_id' => $this->insurer->id,
        ]);
    }

    public function test_the_container_resolves_the_record_only_driver_by_default(): void
    {
        $this->assertInstanceOf(
            RecordOnlyPaymentRecorder::class,
            app(PaymentRecorder::class),
        );
    }

    public function test_settling_a_claim_goes_through_the_adapter(): void
    {
        $fake = new FakePaymentRecorder;
        $this->app->instance(PaymentRecorder::class, $fake);

        $claim = $this->claim();

        $this->actingAs($this->agent())
            ->postJson("/api/v1/insurer/claims/{$claim->id}/settlement", [
                'mode' => 'cash',
                'amount' => 250000,
            ])
            ->assertCreated();

        // Exactly once, with the settlement that was just written.
        $this->assertCount(1, $fake->recorded);
        $this->assertSame(
            Settlement::where('claim_id', $claim->id)->value('id'),
            $fake->recorded[0]->id,
        );
    }

    public function test_the_receipt_reference_reaches_the_claimant_timeline(): void
    {
        $this->app->instance(
            PaymentRecorder::class,
            new FakePaymentRecorder('REC-260730-ABC123'),
        );

        $claim = $this->claim();

        $this->actingAs($this->agent())
            ->postJson("/api/v1/insurer/claims/{$claim->id}/settlement", [
                'mode' => 'cash',
                'amount' => 250000,
            ])
            ->assertCreated();

        $settled = ClaimEvent::where('claim_id', $claim->id)
            ->where('action', 'settled')
            ->firstOrFail();

        $this->assertStringContainsString('REC-260730-ABC123', (string) $settled->note);
    }

    public function test_a_rejected_settlement_never_records_a_payout(): void
    {
        $fake = new FakePaymentRecorder;
        $this->app->instance(PaymentRecorder::class, $fake);

        $claim = $this->claim();

        // A repair order with no workshop is refused before the payout stage.
        $this->actingAs($this->agent())
            ->postJson("/api/v1/insurer/claims/{$claim->id}/settlement", [
                'mode' => 'repair_order',
                'amount' => 250000,
            ])
            ->assertStatus(422);

        $this->assertSame([], $fake->recorded);
    }

    public function test_a_second_settlement_attempt_does_not_record_a_second_payout(): void
    {
        $fake = new FakePaymentRecorder;
        $this->app->instance(PaymentRecorder::class, $fake);

        $claim = $this->claim();
        $agent = $this->agent();

        $payload = ['mode' => 'cash', 'amount' => 250000];

        $this->actingAs($agent)
            ->postJson("/api/v1/insurer/claims/{$claim->id}/settlement", $payload)
            ->assertCreated();

        $this->actingAs($agent)
            ->postJson("/api/v1/insurer/claims/{$claim->id}/settlement", $payload)
            ->assertStatus(422);

        // Paying a claimant twice is the failure that matters here.
        $this->assertCount(1, $fake->recorded);
    }

    private function settlement(): Settlement
    {
        return Settlement::factory()->create([
            'claim_id' => $this->claim()->id,
            'mode' => 'cash',
            'amount' => 250000,
        ]);
    }

    public function test_the_record_only_driver_moves_no_funds(): void
    {
        $receipt = (new RecordOnlyPaymentRecorder)->record($this->settlement());

        // The whole point of the manual mode: a payout is registered, not made.
        $this->assertFalse($receipt->movedFunds);
        $this->assertSame('record_only', $receipt->driver);
        $this->assertMatchesRegularExpression('/^REC-\d{6}-[A-Z0-9]{6}$/', $receipt->reference);
    }

    public function test_the_record_only_driver_logs_the_payout_it_did_not_make(): void
    {
        $settlement = $this->settlement();

        Log::shouldReceive('channel')->once()->with('stack')->andReturnSelf();
        Log::shouldReceive('info')->once()->withArgs(
            fn (string $message) => str_contains($message, 'PAYOUT recorded')
                && str_contains($message, "settlement={$settlement->id}"),
        );

        (new RecordOnlyPaymentRecorder)->record($settlement);
    }

    public function test_the_reference_is_random_rather_than_derived_from_ids(): void
    {
        $settlement = $this->settlement();
        $recorder = new RecordOnlyPaymentRecorder;

        // Two receipts for the same settlement must differ — which they cannot
        // if the reference is built from the row's sequential id. That id is
        // shown to the claimant on the timeline, and rule #10 keeps sequential
        // ids out of anything a user reads.
        $this->assertNotSame(
            $recorder->record($settlement)->reference,
            $recorder->record($settlement)->reference,
        );
    }
}
