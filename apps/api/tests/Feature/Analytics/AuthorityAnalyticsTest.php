<?php

namespace Tests\Feature\Analytics;

use App\Enums\RoleName;
use App\Models\AccidentCase;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthorityAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    private function authorityUser(): User
    {
        $user = User::factory()->create();
        $user->assignRole(RoleName::Authority->value);

        return $user;
    }

    public function test_heatmap_returns_bucketed_coordinates_with_no_personal_data(): void
    {
        AccidentCase::factory()->count(3)->create(['lat' => 33.5123, 'lng' => 36.3123]);
        AccidentCase::factory()->create(['lat' => 34.7, 'lng' => 36.7]);

        $response = $this->actingAs($this->authorityUser())->getJson('/api/v1/authority/heatmap');

        $response->assertOk();
        $data = $response->json('data');

        $this->assertNotEmpty($data);

        foreach ($data as $bucket) {
            $this->assertArrayHasKey('lat', $bucket);
            $this->assertArrayHasKey('lng', $bucket);
            $this->assertArrayHasKey('count', $bucket);
            $this->assertCount(3, $bucket, 'heatmap bucket must only contain lat/lng/count — no case_no or personal fields');
        }

        $bucketWithThree = collect($data)->firstWhere('count', 3);
        $this->assertNotNull($bucketWithThree);
    }

    public function test_black_spots_ranks_regions_by_accident_count(): void
    {
        AccidentCase::factory()->count(5)->create(['region' => 'دمشق']);
        AccidentCase::factory()->count(2)->create(['region' => 'حلب']);

        $response = $this->actingAs($this->authorityUser())->getJson('/api/v1/authority/black-spots');

        $response->assertOk();
        $data = $response->json('data');

        $this->assertSame('دمشق', $data[0]['region']);
        $this->assertSame(5, $data[0]['count']);
        $this->assertSame('حلب', $data[1]['region']);
        $this->assertSame(2, $data[1]['count']);

        foreach ($data as $row) {
            $this->assertCount(2, $row, 'black-spot row must only contain region/count — no personal data');
        }
    }

    public function test_citizen_cannot_access_authority_analytics(): void
    {
        $citizen = User::factory()->create();

        $this->actingAs($citizen)->getJson('/api/v1/authority/heatmap')->assertForbidden();
        $this->actingAs($citizen)->getJson('/api/v1/authority/black-spots')->assertForbidden();
    }
}
