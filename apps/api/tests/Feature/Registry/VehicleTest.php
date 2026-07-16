<?php

namespace Tests\Feature\Registry;

use App\Models\InsurancePolicy;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VehicleTest extends TestCase
{
    use RefreshDatabase;

    public function test_citizen_can_create_list_and_view_their_own_vehicle(): void
    {
        $user = User::factory()->create();

        $create = $this->actingAs($user)->postJson('/api/v1/vehicles', [
            'plate_no' => 'DAM-1234',
            'make' => 'Kia',
            'model' => 'Sportage',
            'year' => 2022,
            'color' => 'White',
        ]);

        $create->assertCreated()->assertJsonPath('data.plate_no', 'DAM-1234');

        $vehicleId = $create->json('data.id');

        $this->actingAs($user)->getJson('/api/v1/vehicles')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->actingAs($user)->getJson("/api/v1/vehicles/{$vehicleId}")
            ->assertOk()
            ->assertJsonPath('data.plate_no', 'DAM-1234');
    }

    public function test_citizen_cannot_view_update_or_delete_another_citizens_vehicle(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $vehicle = Vehicle::factory()->create(['owner_id' => $owner->id]);

        $this->actingAs($intruder)->getJson("/api/v1/vehicles/{$vehicle->id}")->assertForbidden();
        $this->actingAs($intruder)->putJson("/api/v1/vehicles/{$vehicle->id}", ['make' => 'Changed'])->assertForbidden();
        $this->actingAs($intruder)->deleteJson("/api/v1/vehicles/{$vehicle->id}")->assertForbidden();
    }

    public function test_soft_deleting_and_restoring_a_vehicle_keeps_its_policy(): void
    {
        $owner = User::factory()->create();
        $vehicle = Vehicle::factory()->create(['owner_id' => $owner->id]);
        $policy = InsurancePolicy::factory()->create(['vehicle_id' => $vehicle->id]);

        $this->actingAs($owner)->deleteJson("/api/v1/vehicles/{$vehicle->id}")->assertNoContent();

        $this->assertSoftDeleted($vehicle);
        $this->actingAs($owner)->getJson("/api/v1/vehicles/{$vehicle->id}")->assertNotFound();

        $this->actingAs($owner)->postJson("/api/v1/vehicles/{$vehicle->id}/restore")
            ->assertOk()
            ->assertJsonPath('data.id', $vehicle->id);

        $this->assertDatabaseHas('vehicles', ['id' => $vehicle->id, 'deleted_at' => null]);
        $this->assertDatabaseHas('insurance_policies', ['id' => $policy->id, 'vehicle_id' => $vehicle->id]);
    }

    public function test_recreating_a_vehicle_with_a_soft_deleted_plate_restores_it_for_the_same_owner(): void
    {
        $owner = User::factory()->create();
        $vehicle = Vehicle::factory()->create(['owner_id' => $owner->id, 'plate_no' => 'DAM-9999']);
        $vehicle->delete();

        $response = $this->actingAs($owner)->postJson('/api/v1/vehicles', [
            'plate_no' => 'DAM-9999',
            'make' => 'Toyota',
            'model' => 'Corolla',
        ]);

        $response->assertCreated()->assertJsonPath('data.id', $vehicle->id);
        $this->assertDatabaseHas('vehicles', ['id' => $vehicle->id, 'deleted_at' => null, 'make' => 'Toyota']);
        $this->assertSame(1, Vehicle::withTrashed()->where('plate_no', 'DAM-9999')->count());
    }

    public function test_recreating_a_vehicle_with_a_soft_deleted_plate_owned_by_someone_else_is_rejected(): void
    {
        $originalOwner = User::factory()->create();
        $vehicle = Vehicle::factory()->create(['owner_id' => $originalOwner->id, 'plate_no' => 'DAM-5555']);
        $vehicle->delete();

        $otherUser = User::factory()->create();

        $this->actingAs($otherUser)->postJson('/api/v1/vehicles', [
            'plate_no' => 'DAM-5555',
            'make' => 'Toyota',
            'model' => 'Corolla',
        ])->assertUnprocessable()->assertJsonValidationErrors('plate_no');
    }
}
