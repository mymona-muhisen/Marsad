<?php

namespace Tests\Feature\Dispatch;

use App\Enums\CaseStatus;
use App\Enums\CaseTrack;
use App\Enums\DispatchStatus;
use App\Enums\RoleName;
use App\Models\AccidentCase;
use App\Models\Dispatch;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\Support\FakesPhotos;
use Tests\TestCase;

/**
 * What the surveyor console needs beyond the four action endpoints: an address
 * to drive to, and permission to open the case it was sent to.
 */
class SurveyorConsoleTest extends TestCase
{
    use FakesPhotos, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->seed(RoleSeeder::class);
    }

    private function surveyor(?string $zone = 'دمشق'): User
    {
        $user = User::factory()->inZone($zone)->create();
        $user->assignRole(RoleName::Surveyor->value);

        return $user;
    }

    private function dispatchFor(User $surveyor, DispatchStatus $status = DispatchStatus::Assigned): Dispatch
    {
        $case = AccidentCase::factory()->create([
            'status' => CaseStatus::UnderReview->value,
            'track' => CaseTrack::DispatchRequired->value,
            'region' => 'دمشق',
            'location_verified' => false,
            'location_description' => 'أوتوستراد المزة، مقابل مشفى الشامي.',
        ]);

        return Dispatch::factory()->create([
            'case_id' => $case->id,
            'surveyor_id' => $surveyor->id,
            'zone' => 'دمشق',
            'status' => $status->value,
        ]);
    }

    public function test_the_queue_carries_an_address_not_just_a_case_id(): void
    {
        $surveyor = $this->surveyor();
        $this->dispatchFor($surveyor);

        $response = $this->actingAs($surveyor)->getJson('/api/v1/surveyor/dispatches');

        // A dispatch with no address is not a dispatch.
        $response->assertOk()
            ->assertJsonPath('data.0.case.region', 'دمشق')
            ->assertJsonPath('data.0.case.location_description', 'أوتوستراد المزة، مقابل مشفى الشامي.')
            ->assertJsonPath('data.0.case.location_verified', false);

        $this->assertNotEmpty($response->json('data.0.case.case_no'));
    }

    public function test_the_queue_flags_injuries_before_the_surveyor_arrives(): void
    {
        $surveyor = $this->surveyor();
        $dispatch = $this->dispatchFor($surveyor);
        $dispatch->case->forceFill(['injury_flag' => true])->save();

        $this->actingAs($surveyor)
            ->getJson('/api/v1/surveyor/dispatches')
            ->assertOk()
            ->assertJsonPath('data.0.case.injury_flag', true);
    }

    public function test_a_surveyor_can_open_the_case_they_were_sent_to(): void
    {
        $surveyor = $this->surveyor();
        $dispatch = $this->dispatchFor($surveyor);

        $this->actingAs($surveyor)
            ->getJson("/api/v1/cases/{$dispatch->case->case_no}")
            ->assertOk()
            ->assertJsonPath('data.case_no', $dispatch->case->case_no);
    }

    public function test_a_surveyor_cannot_open_a_case_they_hold_no_dispatch_on(): void
    {
        $surveyor = $this->surveyor();
        $this->dispatchFor($surveyor);

        // Being sent to one accident is no reason to read every other one.
        $someoneElses = AccidentCase::factory()->create();

        $this->actingAs($surveyor)
            ->getJson("/api/v1/cases/{$someoneElses->case_no}")
            ->assertForbidden();
    }

    public function test_another_surveyors_dispatch_is_not_listed(): void
    {
        $mine = $this->surveyor();
        $theirs = $this->surveyor();
        $this->dispatchFor($theirs);

        $this->actingAs($mine)
            ->getJson('/api/v1/surveyor/dispatches')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_declining_requires_a_reason(): void
    {
        $surveyor = $this->surveyor();
        $dispatch = $this->dispatchFor($surveyor);

        $this->actingAs($surveyor)
            ->postJson("/api/v1/surveyor/dispatches/{$dispatch->id}/decline", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('reason');
    }

    public function test_the_accept_to_complete_run_moves_the_case_to_evidence_complete(): void
    {
        $surveyor = $this->surveyor();
        $dispatch = $this->dispatchFor($surveyor);

        $this->actingAs($surveyor)
            ->postJson("/api/v1/surveyor/dispatches/{$dispatch->id}/accept")
            ->assertOk()
            ->assertJsonPath('data.status', DispatchStatus::Accepted->value);

        $this->actingAs($surveyor)
            ->postJson("/api/v1/surveyor/dispatches/{$dispatch->id}/on-scene")
            ->assertOk()
            ->assertJsonPath('data.status', DispatchStatus::OnScene->value);

        $this->actingAs($surveyor)
            ->postJson("/api/v1/surveyor/dispatches/{$dispatch->id}/complete", [
                'photos' => $this->fourPhotos('s'),
                'photo_keys' => [
                    (string) Str::uuid(),
                    (string) Str::uuid(),
                    (string) Str::uuid(),
                    (string) Str::uuid(),
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', DispatchStatus::Completed->value);

        $this->assertSame(
            CaseStatus::EvidenceComplete->value,
            $dispatch->case->refresh()->status->value,
        );
    }

    public function test_completing_without_a_key_per_photo_is_rejected(): void
    {
        $surveyor = $this->surveyor();
        $dispatch = $this->dispatchFor($surveyor, DispatchStatus::OnScene);

        // This endpoint mandates the offline-tolerance contract, unlike the
        // citizen paths where the keys are optional.
        $this->actingAs($surveyor)
            ->postJson("/api/v1/surveyor/dispatches/{$dispatch->id}/complete", [
                'photos' => $this->fourPhotos('s'),
                'photo_keys' => [(string) Str::uuid()],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('photo_keys');
    }

    public function test_a_mutation_response_still_carries_the_address(): void
    {
        $surveyor = $this->surveyor();
        $dispatch = $this->dispatchFor($surveyor);

        // The client renders from this response; dropping the case would blank
        // the screen the moment the surveyor pressed accept.
        $this->actingAs($surveyor)
            ->postJson("/api/v1/surveyor/dispatches/{$dispatch->id}/accept")
            ->assertOk()
            ->assertJsonPath('data.case.region', 'دمشق');
    }
}
