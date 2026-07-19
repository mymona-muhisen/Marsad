<?php

namespace Tests\Feature\Analytics;

use App\Enums\RoleName;
use App\Models\FraudFlag;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FraudFlagAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    public function test_regulator_sees_only_aggregate_fraud_flag_counts(): void
    {
        FraudFlag::factory()->count(3)->create(['reason' => 'duplicate_photo_hash']);

        $regulator = User::factory()->create();
        $regulator->assignRole(RoleName::Regulator->value);

        $response = $this->actingAs($regulator)->getJson('/api/v1/regulator/fraud-flags');

        $response->assertOk();
        $data = $response->json('data');

        $this->assertSame(3, $data['total']);
        $this->assertSame('duplicate_photo_hash', $data['by_reason'][0]['reason']);
        $this->assertSame(3, $data['by_reason'][0]['count']);

        // No case_id, evidence_item_id, or any other identifying field —
        // aggregates only (FR-D1, "no personal data").
        $this->assertEqualsCanonicalizing(['total', 'by_reason', 'daily_counts'], array_keys($data));
        foreach ($data['by_reason'] as $row) {
            $this->assertEqualsCanonicalizing(['reason', 'count'], array_keys($row));
        }
    }

    public function test_non_regulator_cannot_access_fraud_flags_report(): void
    {
        $citizen = User::factory()->create();

        $this->actingAs($citizen)->getJson('/api/v1/regulator/fraud-flags')->assertForbidden();
    }
}
