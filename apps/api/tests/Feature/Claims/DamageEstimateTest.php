<?php

namespace Tests\Feature\Claims;

use App\Enums\ClaimStatus;
use App\Enums\RoleName;
use App\Models\Claim;
use App\Models\PartsPrice;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DamageEstimateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    private function workshopUser(): User
    {
        $user = User::factory()->create();
        $user->assignRole(RoleName::Workshop->value);

        return $user;
    }

    public function test_submitting_an_estimate_recalculates_totals_and_moves_claim_to_assessing(): void
    {
        $claim = Claim::factory()->create(['status' => ClaimStatus::Opened->value]);
        $workshop = $this->workshopUser();

        $response = $this->actingAs($workshop)->postJson("/api/v1/claims/{$claim->id}/estimates", [
            'type' => 'workshop',
            'items' => [
                ['description' => 'دهان وتصليح', 'part_code' => null, 'qty' => 1, 'unit_price' => 300000, 'labor_hours' => 4],
                ['description' => 'استبدال', 'part_code' => null, 'qty' => 2, 'unit_price' => 100000],
            ],
        ]);

        $response->assertCreated()->assertJsonPath('data.total', '500000.00');

        $this->assertDatabaseHas('claims', ['id' => $claim->id, 'status' => ClaimStatus::Assessing->value]);
    }

    public function test_a_line_matching_a_part_code_within_threshold_is_not_flagged(): void
    {
        PartsPrice::factory()->create(['part_code' => 'FRONT_BUMPER', 'reference_price' => 800000]);
        $claim = Claim::factory()->create();
        $workshop = $this->workshopUser();

        $response = $this->actingAs($workshop)->postJson("/api/v1/claims/{$claim->id}/estimates", [
            'type' => 'workshop',
            'items' => [
                ['description' => 'مصد أمامي', 'part_code' => 'FRONT_BUMPER', 'qty' => 1, 'unit_price' => 830000],
            ],
        ]);

        $response->assertCreated();
        $this->assertFalse($response->json('data.items.0.deviation_flag'));
    }

    public function test_a_line_deviating_beyond_the_threshold_is_flagged(): void
    {
        PartsPrice::factory()->create(['part_code' => 'FRONT_BUMPER', 'reference_price' => 800000]);
        $claim = Claim::factory()->create();
        $workshop = $this->workshopUser();

        $response = $this->actingAs($workshop)->postJson("/api/v1/claims/{$claim->id}/estimates", [
            'type' => 'workshop',
            'items' => [
                ['description' => 'مصد أمامي', 'part_code' => 'FRONT_BUMPER', 'qty' => 1, 'unit_price' => 1200000],
            ],
        ]);

        $response->assertCreated();
        $this->assertTrue($response->json('data.items.0.deviation_flag'));
    }

    public function test_citizen_cannot_submit_an_estimate(): void
    {
        $claim = Claim::factory()->create();
        $citizen = User::factory()->create();

        $this->actingAs($citizen)->postJson("/api/v1/claims/{$claim->id}/estimates", [
            'type' => 'workshop',
            'items' => [['description' => 'test', 'part_code' => null, 'qty' => 1, 'unit_price' => 1000]],
        ])->assertForbidden();
    }
}
