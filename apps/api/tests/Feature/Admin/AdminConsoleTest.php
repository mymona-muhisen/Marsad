<?php

namespace Tests\Feature\Admin;

use App\Enums\RoleName;
use App\Models\AuditLog;
use App\Models\LiabilityRule;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The admin console — the last role group with no endpoints at all.
 *
 * The interesting cases here are the ones that stop the console being a
 * privilege-escalation surface: an admin must not be able to make themselves
 * super_admin, and must not be able to strip their own last administrative
 * role and lock the console.
 */
class AdminConsoleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    private function withRole(RoleName $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role->value);

        return $user;
    }

    public function test_an_admin_lists_users(): void
    {
        $this->withRole(RoleName::Citizen);

        $this->actingAs($this->withRole(RoleName::Admin))
            ->getJson('/api/v1/admin/users')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'full_name', 'phone', 'roles']]]);
    }

    public function test_users_can_be_filtered_by_role(): void
    {
        $this->withRole(RoleName::Surveyor);
        $this->withRole(RoleName::Citizen);

        $response = $this->actingAs($this->withRole(RoleName::Admin))
            ->getJson('/api/v1/admin/users?role=surveyor');

        $response->assertOk()->assertJsonCount(1, 'data');
        $this->assertContains('surveyor', $response->json('data.0.roles'));
    }

    public function test_users_can_be_searched_by_phone(): void
    {
        User::factory()->create(['phone' => '0987654321', 'full_name' => 'سعاد']);

        $response = $this->actingAs($this->withRole(RoleName::Admin))
            ->getJson('/api/v1/admin/users?q=98765');

        $response->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_an_admin_grants_a_role(): void
    {
        $admin = $this->withRole(RoleName::Admin);
        $subject = $this->withRole(RoleName::Citizen);

        $this->actingAs($admin)
            ->postJson("/api/v1/admin/users/{$subject->id}/roles", [
                'roles' => ['citizen', 'surveyor'],
            ])
            ->assertOk();

        $this->assertTrue($subject->fresh()->hasRole(RoleName::Surveyor->value));
    }

    public function test_granting_a_role_is_audited(): void
    {
        $admin = $this->withRole(RoleName::Admin);
        $subject = $this->withRole(RoleName::Citizen);

        $this->actingAs($admin)
            ->postJson("/api/v1/admin/users/{$subject->id}/roles", [
                'roles' => ['citizen', 'adjudicator'],
            ])
            ->assertOk();

        // CLAUDE.md rule #9 names role changes, but spatie writes the pivot
        // directly so no model event fires — the service logs it explicitly.
        $log = AuditLog::where('action', 'roles_synced')->firstOrFail();

        $this->assertSame($admin->id, $log->user_id);
        $this->assertSame(['citizen'], $log->changes['before']);
        $this->assertSame(['adjudicator', 'citizen'], $log->changes['after']);
    }

    public function test_an_unchanged_role_set_writes_no_audit_row(): void
    {
        $subject = $this->withRole(RoleName::Citizen);

        $this->actingAs($this->withRole(RoleName::Admin))
            ->postJson("/api/v1/admin/users/{$subject->id}/roles", [
                'roles' => ['citizen'],
            ])
            ->assertOk();

        // A trail padded with no-ops is a trail nobody reads.
        $this->assertSame(0, AuditLog::where('action', 'roles_synced')->count());
    }

    public function test_an_admin_cannot_grant_super_admin(): void
    {
        $admin = $this->withRole(RoleName::Admin);
        $subject = $this->withRole(RoleName::Citizen);

        $this->actingAs($admin)
            ->postJson("/api/v1/admin/users/{$subject->id}/roles", [
                'roles' => ['citizen', 'super_admin'],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('roles');

        $this->assertFalse($subject->fresh()->hasRole(RoleName::SuperAdmin->value));
    }

    public function test_an_admin_cannot_make_themselves_super_admin(): void
    {
        $admin = $this->withRole(RoleName::Admin);

        // The escalation the reserved list exists to stop.
        $this->actingAs($admin)
            ->postJson("/api/v1/admin/users/{$admin->id}/roles", [
                'roles' => ['admin', 'super_admin'],
            ])
            ->assertStatus(422);

        $this->assertFalse($admin->fresh()->hasRole(RoleName::SuperAdmin->value));
    }

    public function test_an_admin_cannot_strip_super_admin_from_someone_else(): void
    {
        $admin = $this->withRole(RoleName::Admin);
        $owner = $this->withRole(RoleName::SuperAdmin);

        $this->actingAs($admin)
            ->postJson("/api/v1/admin/users/{$owner->id}/roles", ['roles' => []])
            ->assertStatus(422);

        $this->assertTrue($owner->fresh()->hasRole(RoleName::SuperAdmin->value));
    }

    public function test_an_admin_cannot_remove_their_own_administrative_role(): void
    {
        $admin = $this->withRole(RoleName::Admin);

        $this->actingAs($admin)
            ->postJson("/api/v1/admin/users/{$admin->id}/roles", [
                'roles' => ['citizen'],
            ])
            ->assertStatus(422);

        $this->assertTrue($admin->fresh()->hasRole(RoleName::Admin->value));
    }

    public function test_a_super_admin_may_grant_super_admin(): void
    {
        $owner = $this->withRole(RoleName::SuperAdmin);
        $subject = $this->withRole(RoleName::Citizen);

        $this->actingAs($owner)
            ->postJson("/api/v1/admin/users/{$subject->id}/roles", [
                'roles' => ['super_admin'],
            ])
            ->assertOk();

        $this->assertTrue($subject->fresh()->hasRole(RoleName::SuperAdmin->value));
    }

    public function test_the_audit_log_is_super_admin_only(): void
    {
        $this->actingAs($this->withRole(RoleName::Admin))
            ->getJson('/api/v1/admin/audit-logs')
            ->assertForbidden();

        $this->actingAs($this->withRole(RoleName::SuperAdmin))
            ->getJson('/api/v1/admin/audit-logs')
            ->assertOk();
    }

    public function test_the_console_is_closed_to_every_other_role(): void
    {
        foreach ([RoleName::Citizen, RoleName::Regulator, RoleName::InsurerAdmin] as $role) {
            $this->actingAs($this->withRole($role))
                ->getJson('/api/v1/admin/users')
                ->assertForbidden();
        }
    }

    public function test_publishing_a_rule_supersedes_rather_than_updates(): void
    {
        $existing = LiabilityRule::factory()->create([
            'scenario_code' => 'REAR_END',
            'version' => 1,
            'fault_split_a' => 100,
            'fault_split_b' => 0,
            'effective_from' => now()->subYear()->toDateString(),
            'effective_to' => null,
        ]);

        $this->actingAs($this->withRole(RoleName::Admin))
            ->postJson('/api/v1/admin/liability-rules', [
                'scenario_code' => 'REAR_END',
                'description_ar' => 'نسخة معدّلة.',
                'fault_split_a' => 75,
                'fault_split_b' => 25,
                'effective_from' => now()->addDay()->toDateString(),
            ])
            ->assertCreated()
            ->assertJsonPath('data.version', 2);

        // Rule #5: decisions pin rule_id, so the old row must survive intact.
        $existing->refresh();
        $this->assertSame(100, $existing->fault_split_a);
        $this->assertNotNull($existing->effective_to);
        $this->assertSame(2, LiabilityRule::where('scenario_code', 'REAR_END')->count());
    }

    public function test_a_rule_whose_splits_do_not_total_100_is_rejected(): void
    {
        $this->actingAs($this->withRole(RoleName::Admin))
            ->postJson('/api/v1/admin/liability-rules', [
                'scenario_code' => 'NEW_CASE',
                'description_ar' => 'وصف.',
                'fault_split_a' => 60,
                'fault_split_b' => 30,
                'effective_from' => now()->addDay()->toDateString(),
            ])
            ->assertStatus(422);
    }

    public function test_a_new_version_cannot_predate_the_current_one(): void
    {
        LiabilityRule::factory()->create([
            'scenario_code' => 'REAR_END',
            'version' => 1,
            'effective_from' => now()->toDateString(),
            'effective_to' => null,
        ]);

        $this->actingAs($this->withRole(RoleName::Admin))
            ->postJson('/api/v1/admin/liability-rules', [
                'scenario_code' => 'REAR_END',
                'description_ar' => 'نسخة بأثر رجعي.',
                'fault_split_a' => 50,
                'fault_split_b' => 50,
                'effective_from' => now()->subMonth()->toDateString(),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('effective_from');
    }

    public function test_publishing_a_rule_is_audited(): void
    {
        $admin = $this->withRole(RoleName::Admin);

        $this->actingAs($admin)
            ->postJson('/api/v1/admin/liability-rules', [
                'scenario_code' => 'NEW_CASE',
                'description_ar' => 'وصف.',
                'fault_split_a' => 100,
                'fault_split_b' => 0,
                'effective_from' => now()->addDay()->toDateString(),
            ])
            ->assertCreated();

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $admin->id,
            'action' => 'liability_rule_published',
        ]);
    }
}
