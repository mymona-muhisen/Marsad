<?php

namespace Tests\Feature\Dispatch;

use App\Enums\CaseTrack;
use App\Enums\RoleName;
use App\Models\AccidentCase;
use App\Models\Dispatch;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\Cases\DispatchService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\Support\FakesPhotos;
use Tests\TestCase;

class DispatchAssignmentTest extends TestCase
{
    use FakesPhotos, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    private function surveyor(?string $zone): User
    {
        $surveyor = User::factory()->inZone($zone)->create();
        $surveyor->assignRole(RoleName::Surveyor->value);

        return $surveyor;
    }

    public function test_assigns_the_least_busy_surveyor_in_the_matching_zone(): void
    {
        $zoneSurveyor = $this->surveyor('Damascus');
        $otherZoneSurveyor = $this->surveyor('Aleppo');

        $case = AccidentCase::factory()->create(['region' => 'Damascus', 'track' => CaseTrack::DispatchRequired->value]);

        $dispatch = $this->app->make(DispatchService::class)->assign($case);

        $this->assertNotNull($dispatch);
        $this->assertSame($zoneSurveyor->id, $dispatch->surveyor_id);
        $this->assertNotEquals($otherZoneSurveyor->id, $dispatch->surveyor_id);
    }

    public function test_falls_back_to_any_surveyor_when_no_zone_match_exists(): void
    {
        $surveyor = $this->surveyor('Homs');

        $case = AccidentCase::factory()->create(['region' => 'Damascus', 'track' => CaseTrack::DispatchRequired->value]);

        $dispatch = $this->app->make(DispatchService::class)->assign($case);

        $this->assertNotNull($dispatch);
        $this->assertSame($surveyor->id, $dispatch->surveyor_id);
    }

    public function test_prefers_the_surveyor_with_fewer_active_dispatches(): void
    {
        $busySurveyor = $this->surveyor('Damascus');
        $freeSurveyor = $this->surveyor('Damascus');

        Dispatch::factory()->create([
            'surveyor_id' => $busySurveyor->id,
            'zone' => 'Damascus',
            'status' => 'assigned',
        ]);

        $case = AccidentCase::factory()->create(['region' => 'Damascus', 'track' => CaseTrack::DispatchRequired->value]);

        $dispatch = $this->app->make(DispatchService::class)->assign($case);

        $this->assertSame($freeSurveyor->id, $dispatch->surveyor_id);
    }

    public function test_case_creation_with_dispatch_required_track_auto_assigns_a_surveyor(): void
    {
        Storage::fake('public');

        $surveyor = $this->surveyor('Damascus');

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

        $response->assertCreated()->assertJsonPath('data.track', 'dispatch_required');

        $caseNo = $response->json('data.case_no');
        $case = AccidentCase::where('case_no', $caseNo)->firstOrFail();

        $this->assertDatabaseHas('dispatches', [
            'case_id' => $case->id,
            'surveyor_id' => $surveyor->id,
            'status' => 'assigned',
        ]);

        // Sprint 4: dispatch_required must wait for the surveyor, not
        // jump straight to evidence_complete like a resolved hit-and-run
        // with no dispatch requirement would.
        $this->assertSame('under_review', $case->status->value);
    }
}
