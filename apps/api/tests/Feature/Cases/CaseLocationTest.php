<?php

namespace Tests\Feature\Cases;

use App\Models\AccidentCase;
use App\Models\User;
use App\Models\Vehicle;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\Support\FakesPhotos;
use Tests\TestCase;

/**
 * Reports filed without a device GPS fix.
 *
 * Coordinates derived from a governorate choice are city-scale, so the written
 * location becomes mandatory — otherwise a dispatched surveyor has nothing but
 * "somewhere in Damascus" to work with.
 */
class CaseLocationTest extends TestCase
{
    use FakesPhotos, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(Vehicle $vehicle, array $overrides = []): array
    {
        return array_merge([
            'vehicle_id' => $vehicle->id,
            'occurred_at' => now()->subMinutes(20)->toISOString(),
            'lat' => 33.5138,
            'lng' => 36.2765,
            'injury_flag' => false,
            'statement' => 'اصطدمت بي المركبة من الخلف.',
            'photos' => $this->fourPhotos('r'),
            'counterparty_phone' => '0922222222',
        ], $overrides);
    }

    public function test_unverified_location_requires_a_written_description(): void
    {
        Storage::fake('public');

        $reporter = User::factory()->create(['phone' => '0911111111']);
        $vehicle = Vehicle::factory()->create(['owner_id' => $reporter->id]);

        $this->actingAs($reporter)
            ->postJson('/api/v1/cases', $this->payload($vehicle, [
                'location_verified' => false,
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('location_description');
    }

    public function test_unverified_location_is_accepted_with_a_description(): void
    {
        Storage::fake('public');

        $reporter = User::factory()->create(['phone' => '0911111112']);
        $vehicle = Vehicle::factory()->create(['owner_id' => $reporter->id]);

        $response = $this->actingAs($reporter)
            ->postJson('/api/v1/cases', $this->payload($vehicle, [
                'location_verified' => false,
                'location_description' => 'أوتوستراد المزة، مقابل مشفى الشامي',
                'region' => 'دمشق',
            ]));

        $response->assertCreated()
            ->assertJsonPath('data.location_verified', false)
            ->assertJsonPath('data.location_description', 'أوتوستراد المزة، مقابل مشفى الشامي')
            ->assertJsonPath('data.region', 'دمشق');

        $case = AccidentCase::where('case_no', $response->json('data.case_no'))->firstOrFail();
        $this->assertSame('أوتوستراد المزة، مقابل مشفى الشامي', $case->location_description);
        // The heatmap groups on this column; a self-reported case used to leave
        // it null, which silently excluded it from black-spot ranking.
        $this->assertSame('دمشق', $case->region);
    }

    public function test_device_verified_location_needs_no_description(): void
    {
        Storage::fake('public');

        $reporter = User::factory()->create(['phone' => '0911111113']);
        $vehicle = Vehicle::factory()->create(['owner_id' => $reporter->id]);

        $this->actingAs($reporter)
            ->postJson('/api/v1/cases', $this->payload($vehicle, [
                'location_verified' => true,
            ]))
            ->assertCreated()
            ->assertJsonPath('data.location_description', null);
    }

    public function test_description_is_length_capped(): void
    {
        Storage::fake('public');

        $reporter = User::factory()->create(['phone' => '0911111114']);
        $vehicle = Vehicle::factory()->create(['owner_id' => $reporter->id]);

        $this->actingAs($reporter)
            ->postJson('/api/v1/cases', $this->payload($vehicle, [
                'location_verified' => false,
                'location_description' => str_repeat('ا', 256),
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('location_description');
    }
}
