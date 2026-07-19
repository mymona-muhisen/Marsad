<?php

namespace Tests\Feature\Cases;

use App\Enums\CaseStatus;
use App\Models\AccidentCase;
use App\Models\CaseParty;
use App\Models\User;
use App\Models\Vehicle;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\Support\FakesPhotos;
use Tests\TestCase;

class CaseReportingTest extends TestCase
{
    use FakesPhotos, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // dispatch_required cases now auto-assign a surveyor (Sprint 4),
        // which resolves the role via spatie/laravel-permission and throws
        // RoleDoesNotExist if the role isn't seeded.
        $this->seed(RoleSeeder::class);
    }

    public function test_full_happy_path_report_counterparty_join_evidence_complete(): void
    {
        Storage::fake('public');

        $reporter = User::factory()->create(['phone' => '0911111111']);
        $vehicle = Vehicle::factory()->create(['owner_id' => $reporter->id]);
        $counterpartyPhone = '0922222222';

        $reportResponse = $this->actingAs($reporter)->postJson('/api/v1/cases', [
            'vehicle_id' => $vehicle->id,
            'occurred_at' => now()->subMinutes(30)->toISOString(),
            'lat' => 33.5,
            'lng' => 36.3,
            'injury_flag' => false,
            'statement' => 'اصطدمت السيارة الأخرى بمركبتي عند الإشارة.',
            'photos' => $this->fourPhotos('r'),
            'counterparty_phone' => $counterpartyPhone,
        ]);

        $reportResponse->assertCreated()
            ->assertJsonPath('data.status', CaseStatus::AwaitingCounterparty->value)
            ->assertJsonPath('data.track', 'dispatch_required');

        $caseNo = $reportResponse->json('data.case_no');
        $party = CaseParty::where('unregistered_phone', $counterpartyPhone)->firstOrFail();
        $this->assertNotNull($party->join_token);

        $teaser = $this->getJson("/api/v1/cases/join/{$party->join_token}");
        $teaser->assertOk()->assertJsonPath('data.case_no', $caseNo);
        $this->assertArrayNotHasKey('statement_text', $teaser->json('data'));

        $counterparty = User::factory()->create(['phone' => $counterpartyPhone]);

        $joinResponse = $this->actingAs($counterparty)->postJson("/api/v1/cases/join/{$party->join_token}", [
            'statement' => 'كنت أقود بحذر ولم أستطع تفادي الاصطدام.',
            'photos' => $this->fourPhotos('c'),
        ]);

        $joinResponse->assertOk()->assertJsonPath('data.status', CaseStatus::EvidenceComplete->value);

        $case = AccidentCase::where('case_no', $caseNo)->firstOrFail();

        $this->assertDatabaseHas('case_parties', [
            'case_id' => $case->id,
            'user_id' => $counterparty->id,
            'join_token' => null,
        ]);

        $this->assertSame(8, $case->evidenceItems()->count());
    }

    public function test_duplicate_photo_hash_across_cases_creates_a_fraud_flag(): void
    {
        Storage::fake('public');

        $sharedSuffix = random_bytes(16);
        $sharedA = $this->fakePhoto('shared.jpg', $sharedSuffix);
        $sharedB = $this->fakePhoto('shared.jpg', $sharedSuffix);

        $reporterA = User::factory()->create();
        $vehicleA = Vehicle::factory()->create(['owner_id' => $reporterA->id]);

        $this->actingAs($reporterA)->postJson('/api/v1/cases', [
            'vehicle_id' => $vehicleA->id,
            'occurred_at' => now()->subHour()->toISOString(),
            'lat' => 33.5,
            'lng' => 36.3,
            'injury_flag' => false,
            'statement' => 'test',
            'photos' => [$sharedA, ...$this->fourPhotos('a')],
            'hit_and_run' => true,
        ])->assertCreated();

        $reporterB = User::factory()->create();
        $vehicleB = Vehicle::factory()->create(['owner_id' => $reporterB->id]);

        $this->actingAs($reporterB)->postJson('/api/v1/cases', [
            'vehicle_id' => $vehicleB->id,
            'occurred_at' => now()->subHour()->toISOString(),
            'lat' => 33.5,
            'lng' => 36.3,
            'injury_flag' => false,
            'statement' => 'test',
            'photos' => [$sharedB, ...$this->fourPhotos('b')],
            'hit_and_run' => true,
        ])->assertCreated();

        $this->assertDatabaseCount('fraud_flags', 1);
        $this->assertDatabaseHas('fraud_flags', ['reason' => 'duplicate_photo_hash']);
    }

    public function test_unauthorized_user_cannot_view_a_case_they_are_not_a_party_to(): void
    {
        Storage::fake('public');

        $reporter = User::factory()->create();
        $vehicle = Vehicle::factory()->create(['owner_id' => $reporter->id]);

        $response = $this->actingAs($reporter)->postJson('/api/v1/cases', [
            'vehicle_id' => $vehicle->id,
            'occurred_at' => now()->subHour()->toISOString(),
            'lat' => 33.5,
            'lng' => 36.3,
            'injury_flag' => false,
            'statement' => 'test',
            'photos' => $this->fourPhotos(),
            'hit_and_run' => true,
        ]);

        $caseNo = $response->json('data.case_no');
        $intruder = User::factory()->create();

        $this->actingAs($intruder)->getJson("/api/v1/cases/{$caseNo}")->assertForbidden();
        $this->actingAs($reporter)->getJson("/api/v1/cases/{$caseNo}")->assertOk();
    }
}
