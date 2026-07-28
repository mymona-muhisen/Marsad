<?php

namespace Tests\Feature\Hardening;

use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaginationTest extends TestCase
{
    use RefreshDatabase;

    public function test_vehicle_index_is_paginated(): void
    {
        $owner = User::factory()->create();
        Vehicle::factory()->count(20)->create(['owner_id' => $owner->id]);

        $response = $this->actingAs($owner)->getJson('/api/v1/vehicles?per_page=5');

        $response->assertOk();
        $response->assertJsonCount(5, 'data');
        $this->assertSame(20, $response->json('meta.total'));
        $this->assertSame(4, $response->json('meta.last_page'));
        $this->assertArrayHasKey('links', $response->json());
    }

    public function test_per_page_is_capped_at_one_hundred(): void
    {
        $owner = User::factory()->create();
        Vehicle::factory()->count(3)->create(['owner_id' => $owner->id]);

        $response = $this->actingAs($owner)->getJson('/api/v1/vehicles?per_page=500');

        $response->assertOk();
        $this->assertSame(100, $response->json('meta.per_page'));
    }
}
