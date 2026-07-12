<?php

namespace Tests\Feature\Seeders;

use App\Enums\RoleName;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RoleSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeds_all_thirteen_roles_from_doc_01(): void
    {
        (new RoleSeeder)->run();

        $this->assertSame(13, Role::count());

        foreach (RoleName::cases() as $role) {
            $this->assertDatabaseHas('roles', ['name' => $role->value, 'guard_name' => 'web']);
        }
    }

    public function test_seeding_twice_does_not_duplicate_roles(): void
    {
        (new RoleSeeder)->run();
        (new RoleSeeder)->run();

        $this->assertSame(13, Role::count());
    }
}
