<?php

namespace Tests\Feature\Cases;

use App\Enums\CaseStatus;
use App\Models\AccidentCase;
use App\Models\CaseParty;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CaseReportingTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A minimal valid 1x1 JPEG (real SOI/EOI structure), base64-encoded.
     * `mimes:jpg` validates by sniffing actual file content, not just the
     * extension — `UploadedFile::fake()->create()` writes an empty file
     * (its $kilobytes only fakes the reported size) and GD isn't installed
     * in this environment, so neither `create()` nor `image()` works here.
     */
    private const MINIMAL_JPEG_BASE64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

    /**
     * Trailing bytes after a JPEG's EOI marker don't affect MIME sniffing
     * (finfo only inspects the header), so appending random bytes gives
     * each photo a distinct SHA-256 while staying a validly-typed upload.
     * Pass a fixed $suffix to make two calls hash identically on purpose.
     */
    private function fakePhoto(string $name, ?string $suffix = null): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'evidence');
        file_put_contents($path, base64_decode(self::MINIMAL_JPEG_BASE64).($suffix ?? random_bytes(16)));

        return new UploadedFile($path, $name, 'image/jpeg', null, true);
    }

    /**
     * @return list<UploadedFile>
     */
    private function fourPhotos(string $prefix = 'p'): array
    {
        return [
            $this->fakePhoto("{$prefix}1.jpg"),
            $this->fakePhoto("{$prefix}2.jpg"),
            $this->fakePhoto("{$prefix}3.jpg"),
            $this->fakePhoto("{$prefix}4.jpg"),
        ];
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
