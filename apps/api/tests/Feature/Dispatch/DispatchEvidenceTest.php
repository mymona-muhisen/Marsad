<?php

namespace Tests\Feature\Dispatch;

use App\Enums\CaseStatus;
use App\Enums\CaseTrack;
use App\Enums\RoleName;
use App\Models\AccidentCase;
use App\Models\Dispatch;
use App\Models\EvidenceItem;
use App\Models\User;
use App\Services\Cases\DispatchService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\Support\FakesPhotos;
use Tests\TestCase;

class DispatchEvidenceTest extends TestCase
{
    use FakesPhotos, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    private function dispatchedCase(): Dispatch
    {
        $surveyor = User::factory()->inZone('دمشق')->create();
        $surveyor->assignRole(RoleName::Surveyor->value);

        $case = AccidentCase::factory()->create([
            'region' => 'دمشق',
            'status' => CaseStatus::UnderReview->value,
            'track' => CaseTrack::DispatchRequired->value,
        ]);

        return $this->app->make(DispatchService::class)->assign($case);
    }

    public function test_accept_then_on_scene_then_complete_transitions_case_to_evidence_complete(): void
    {
        Storage::fake('public');

        $dispatch = $this->dispatchedCase();
        $surveyor = User::find($dispatch->surveyor_id);

        $this->actingAs($surveyor)->postJson("/api/v1/surveyor/dispatches/{$dispatch->id}/accept")
            ->assertOk()->assertJsonPath('data.status', 'accepted');

        $this->actingAs($surveyor)->postJson("/api/v1/surveyor/dispatches/{$dispatch->id}/on-scene")
            ->assertOk()->assertJsonPath('data.status', 'on_scene');

        $response = $this->actingAs($surveyor)->postJson("/api/v1/surveyor/dispatches/{$dispatch->id}/complete", [
            'photos' => $this->fourPhotos(),
            'photo_keys' => [(string) Str::uuid(), (string) Str::uuid(), (string) Str::uuid(), (string) Str::uuid()],
        ]);

        $response->assertOk()->assertJsonPath('data.status', 'completed');

        $this->assertDatabaseHas('accident_cases', [
            'id' => $dispatch->case_id,
            'status' => CaseStatus::EvidenceComplete->value,
        ]);

        $this->assertSame(4, EvidenceItem::where('case_id', $dispatch->case_id)->count());
    }

    public function test_completing_with_a_repeated_idempotency_key_does_not_duplicate_evidence(): void
    {
        Storage::fake('public');

        $dispatch = $this->dispatchedCase();
        $surveyor = User::find($dispatch->surveyor_id);
        $key = (string) Str::uuid();

        $this->actingAs($surveyor)->postJson("/api/v1/surveyor/dispatches/{$dispatch->id}/complete", [
            'photos' => [$this->fakePhoto('scene1.jpg')],
            'photo_keys' => [$key],
        ])->assertOk();

        $this->assertSame(1, EvidenceItem::where('case_id', $dispatch->case_id)->count());

        // Simulate a dropped-connection retry: same idempotency key again.
        $this->actingAs($surveyor)->postJson("/api/v1/surveyor/dispatches/{$dispatch->id}/complete", [
            'photos' => [$this->fakePhoto('scene1-retry.jpg')],
            'photo_keys' => [$key],
        ])->assertOk();

        $this->assertSame(1, EvidenceItem::where('case_id', $dispatch->case_id)->count());
        $this->assertDatabaseHas('evidence_items', ['case_id' => $dispatch->case_id, 'idempotency_key' => $key]);
    }
}
