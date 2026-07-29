<?php

namespace Tests\Feature\Dispatch;

use App\Enums\CaseTrack;
use App\Enums\RoleName;
use App\Models\AccidentCase;
use App\Models\User;
use App\Services\Cases\DispatchService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DispatchAuthzTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    private function surveyor(string $zone): User
    {
        $surveyor = User::factory()->inZone($zone)->create();
        $surveyor->assignRole(RoleName::Surveyor->value);

        return $surveyor;
    }

    public function test_citizen_cannot_access_surveyor_dispatch_routes(): void
    {
        $citizen = User::factory()->create();

        $this->actingAs($citizen)->getJson('/api/v1/surveyor/dispatches')->assertForbidden();
    }

    public function test_surveyor_cannot_accept_another_surveyors_dispatch(): void
    {
        $ownerSurveyor = $this->surveyor('دمشق');
        $otherSurveyor = $this->surveyor('دمشق');

        $case = AccidentCase::factory()->create(['region' => 'دمشق', 'track' => CaseTrack::DispatchRequired->value]);
        $dispatch = $this->app->make(DispatchService::class)->assign($case);
        $this->assertSame($ownerSurveyor->id, $dispatch->surveyor_id);

        $this->actingAs($otherSurveyor)->postJson("/api/v1/surveyor/dispatches/{$dispatch->id}/accept")
            ->assertForbidden();

        $this->assertDatabaseHas('dispatches', ['id' => $dispatch->id, 'status' => 'assigned']);
    }

    public function test_surveyor_cannot_decline_another_surveyors_dispatch(): void
    {
        $ownerSurveyor = $this->surveyor('دمشق');
        $otherSurveyor = $this->surveyor('دمشق');

        $case = AccidentCase::factory()->create(['region' => 'دمشق', 'track' => CaseTrack::DispatchRequired->value]);
        $dispatch = $this->app->make(DispatchService::class)->assign($case);
        $this->assertSame($ownerSurveyor->id, $dispatch->surveyor_id);

        $this->actingAs($otherSurveyor)->postJson("/api/v1/surveyor/dispatches/{$dispatch->id}/decline", [
            'reason' => 'not mine',
        ])->assertForbidden();

        $this->assertDatabaseHas('dispatches', ['id' => $dispatch->id, 'status' => 'assigned']);
    }

    public function test_surveyor_only_sees_their_own_dispatches(): void
    {
        $surveyorA = $this->surveyor('دمشق');
        $surveyorB = $this->surveyor('دمشق');

        $caseA = AccidentCase::factory()->create(['region' => 'دمشق', 'track' => CaseTrack::DispatchRequired->value]);
        $dispatchService = $this->app->make(DispatchService::class);
        $dispatchA = $dispatchService->assign($caseA);
        $this->assertSame($surveyorA->id, $dispatchA->surveyor_id);

        $response = $this->actingAs($surveyorB)->getJson('/api/v1/surveyor/dispatches');

        $response->assertOk()->assertJsonCount(0, 'data');
    }
}
