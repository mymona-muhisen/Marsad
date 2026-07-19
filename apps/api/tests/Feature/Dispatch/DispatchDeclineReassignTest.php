<?php

namespace Tests\Feature\Dispatch;

use App\Enums\CaseTrack;
use App\Enums\RoleName;
use App\Models\AccidentCase;
use App\Models\Dispatch;
use App\Models\User;
use App\Services\Cases\DispatchService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DispatchDeclineReassignTest extends TestCase
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

    public function test_declining_reassigns_to_a_different_surveyor_and_keeps_full_history(): void
    {
        $firstSurveyor = $this->surveyor('Damascus');
        $secondSurveyor = $this->surveyor('Damascus');

        $case = AccidentCase::factory()->create(['region' => 'Damascus', 'track' => CaseTrack::DispatchRequired->value]);
        $dispatchService = $this->app->make(DispatchService::class);

        $firstDispatch = $dispatchService->assign($case);
        $this->assertSame($firstSurveyor->id, $firstDispatch->surveyor_id);

        $response = $this->actingAs($firstSurveyor)
            ->postJson("/api/v1/surveyor/dispatches/{$firstDispatch->id}/decline", [
                'reason' => 'مشغول بحادث آخر',
            ]);

        $response->assertOk()->assertJsonPath('data.status', 'declined');

        $this->assertDatabaseHas('dispatches', [
            'id' => $firstDispatch->id,
            'status' => 'declined',
            'decline_reason' => 'مشغول بحادث آخر',
        ]);

        $this->assertDatabaseHas('dispatches', [
            'case_id' => $case->id,
            'surveyor_id' => $secondSurveyor->id,
            'status' => 'assigned',
        ]);

        // Full assignment history is kept as rows — nothing overwritten.
        $this->assertSame(2, Dispatch::where('case_id', $case->id)->count());
    }

    public function test_decline_requires_a_reason(): void
    {
        $surveyor = $this->surveyor('Damascus');
        $case = AccidentCase::factory()->create(['region' => 'Damascus', 'track' => CaseTrack::DispatchRequired->value]);
        $dispatch = $this->app->make(DispatchService::class)->assign($case);

        $this->actingAs($surveyor)
            ->postJson("/api/v1/surveyor/dispatches/{$dispatch->id}/decline", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reason');
    }

    public function test_declined_surveyor_is_not_reassigned_the_same_case(): void
    {
        $onlySurveyor = $this->surveyor('Damascus');

        $case = AccidentCase::factory()->create(['region' => 'Damascus', 'track' => CaseTrack::DispatchRequired->value]);
        $dispatchService = $this->app->make(DispatchService::class);

        $dispatch = $dispatchService->assign($case);
        $this->assertSame($onlySurveyor->id, $dispatch->surveyor_id);

        $this->actingAs($onlySurveyor)
            ->postJson("/api/v1/surveyor/dispatches/{$dispatch->id}/decline", ['reason' => 'test'])
            ->assertOk();

        // No other surveyor exists, so reassignment finds nobody — the
        // declined surveyor must not be reassigned their own decline.
        $this->assertSame(1, Dispatch::where('case_id', $case->id)->count());
    }
}
