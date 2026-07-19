<?php

namespace Tests\Feature\Registry;

use App\Enums\OrganizationType;
use App\Enums\VerificationStatus;
use App\Models\InsurancePolicy;
use App\Models\Organization;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_attach_a_policy_with_a_document_photo(): void
    {
        Storage::fake('public');

        $owner = User::factory()->create();
        $vehicle = Vehicle::factory()->create(['owner_id' => $owner->id]);
        $insurer = Organization::factory()->create(['type' => OrganizationType::Insurer->value]);

        $response = $this->actingAs($owner)->postJson("/api/v1/vehicles/{$vehicle->id}/policies", [
            'insurer_org_id' => $insurer->id,
            'policy_no' => 'POL-0001',
            'type' => 'compulsory_tpl',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addYear()->toDateString(),
            'document' => UploadedFile::fake()->create('policy.jpg', 100, 'image/jpeg'),
        ]);

        $response->assertCreated()->assertJsonPath('data.verification_status', VerificationStatus::Pending->value);

        $policy = InsurancePolicy::firstOrFail();
        Storage::disk('public')->assertExists($policy->document_path);
    }

    public function test_citizen_cannot_attach_a_policy_to_someone_elses_vehicle(): void
    {
        Storage::fake('public');

        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $vehicle = Vehicle::factory()->create(['owner_id' => $owner->id]);
        $insurer = Organization::factory()->create(['type' => OrganizationType::Insurer->value]);

        $this->actingAs($intruder)->postJson("/api/v1/vehicles/{$vehicle->id}/policies", [
            'insurer_org_id' => $insurer->id,
            'policy_no' => 'POL-0002',
            'type' => 'comprehensive',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addYear()->toDateString(),
            'document' => UploadedFile::fake()->create('policy.jpg', 100, 'image/jpeg'),
        ])->assertForbidden();
    }

    public function test_citizen_only_sees_their_own_policies_in_mine_endpoint(): void
    {
        $owner = User::factory()->create();
        $otherOwner = User::factory()->create();

        $ownVehicle = Vehicle::factory()->create(['owner_id' => $owner->id]);
        $otherVehicle = Vehicle::factory()->create(['owner_id' => $otherOwner->id]);

        InsurancePolicy::factory()->create(['vehicle_id' => $ownVehicle->id]);
        InsurancePolicy::factory()->create(['vehicle_id' => $otherVehicle->id]);

        $this->actingAs($owner)->getJson('/api/v1/policies')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.vehicle_id', $ownVehicle->id);
    }
}
