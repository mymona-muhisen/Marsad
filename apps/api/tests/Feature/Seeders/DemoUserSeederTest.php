<?php

namespace Tests\Feature\Seeders;

use App\Enums\RoleName;
use App\Models\User;
use Database\Seeders\DemoUserSeeder;
use Database\Seeders\OrganizationSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoUserSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(OrganizationSeeder::class);
    }

    public function test_it_creates_one_signin_for_every_role(): void
    {
        $this->seed(DemoUserSeeder::class);

        $this->assertCount(count(RoleName::cases()), DemoUserSeeder::ACCOUNTS);

        foreach (DemoUserSeeder::ACCOUNTS as $phone => [$role]) {
            $user = User::where('phone', $phone)->first();

            $this->assertNotNull($user, "No demo account seeded for {$phone}.");
            $this->assertTrue($user->hasRole($role->value));
            $this->assertNotNull($user->phone_verified_at);
        }
    }

    public function test_organization_scoped_roles_get_an_organization(): void
    {
        $this->seed(DemoUserSeeder::class);

        // Without these, the insurer/assessor/workshop endpoints return empty
        // or fail — the role alone is not enough (doc 01 §B.4).
        foreach (['0900000005', '0900000006', '0900000007', '0900000008', '0900000009', '0900000010'] as $phone) {
            $this->assertNotNull(
                User::where('phone', $phone)->firstOrFail()->organization_id,
                "Demo account {$phone} holds an org-scoped role but has no organization.",
            );
        }
    }

    public function test_the_surveyor_sits_in_a_real_dispatch_zone(): void
    {
        $this->seed(DemoUserSeeder::class);

        $surveyor = User::where('phone', DemoUserSeeder::SURVEYOR_PHONE)->firstOrFail();

        $this->assertContains($surveyor->zone, config('zones.zones'));
        // And that zone must be a region the intake can actually produce.
        $this->assertContains($surveyor->zone, config('regions.governorates'));
    }

    public function test_reseeding_is_idempotent(): void
    {
        $this->seed(DemoUserSeeder::class);
        $this->seed(DemoUserSeeder::class);

        $citizen = User::where('phone', DemoUserSeeder::CITIZEN_PHONE)->get();

        $this->assertCount(1, $citizen);
        // syncRoles, not assignRole — a second pass must not stack role rows.
        $this->assertCount(1, $citizen->first()->roles);
    }

    public function test_a_role_removed_by_hand_is_restored_on_the_next_seed(): void
    {
        $this->seed(DemoUserSeeder::class);

        $regulator = User::where('phone', '0900000009')->firstOrFail();
        $regulator->syncRoles([]);

        $this->seed(DemoUserSeeder::class);

        $this->assertTrue(
            $regulator->fresh()->hasRole(RoleName::Regulator->value),
        );
    }
}
