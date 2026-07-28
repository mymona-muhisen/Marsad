<?php

namespace Tests\Feature\Auth;

use App\Enums\RoleName;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SessionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    public function test_me_returns_the_authenticated_user_with_roles(): void
    {
        $user = User::factory()->create(['phone' => '0911111111']);
        $user->assignRole(RoleName::Citizen->value);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonStructure([
                'data' => ['id', 'full_name', 'phone', 'locale', 'status', 'organization_id', 'roles'],
            ])
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.roles', [RoleName::Citizen->value]);
    }

    public function test_me_rejects_an_unauthenticated_caller(): void
    {
        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    /**
     * Sanctum's RequestGuard caches the resolved user on the guard instance,
     * and a feature test shares one application instance across every request
     * it makes — so without this, the second request silently reuses the first
     * request's user and the assertion proves nothing. Production resolves auth
     * from a fresh instance per request; this restores that behaviour.
     */
    private function forgetResolvedAuth(): void
    {
        $this->app['auth']->forgetGuards();
    }

    public function test_logout_revokes_only_the_calling_token(): void
    {
        $user = User::factory()->create(['phone' => '0922222222']);
        $user->assignRole(RoleName::Citizen->value);

        $phone = $user->createToken('phone')->plainTextToken;
        $tablet = $user->createToken('tablet')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$phone}")
            ->postJson('/api/v1/auth/logout')
            ->assertOk();

        // Exactly one token row is gone, and it is the caller's.
        $this->assertSame(1, $user->tokens()->count());
        $this->assertSame('tablet', $user->tokens()->firstOrFail()->name);

        // The signed-out device is done...
        $this->forgetResolvedAuth();
        $this->withHeader('Authorization', "Bearer {$phone}")
            ->getJson('/api/v1/auth/me')
            ->assertUnauthorized();

        // ...but the user's other device keeps its session.
        $this->forgetResolvedAuth();
        $this->withHeader('Authorization', "Bearer {$tablet}")
            ->getJson('/api/v1/auth/me')
            ->assertOk();
    }
}
