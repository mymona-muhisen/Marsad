<?php

namespace App\Services\Admin;

use App\Enums\RoleName;
use App\Models\User;
use App\Services\Audit\AuditLogService;
use Illuminate\Validation\ValidationException;

class RoleAssignmentService
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    /**
     * Roles only a super_admin may grant or take away.
     *
     * Without this an `admin` could hand themselves `super_admin` and inherit
     * audit-log access and system configuration — privilege escalation through
     * the very screen meant to govern privilege.
     */
    private const RESERVED = [RoleName::SuperAdmin->value];

    /**
     * @param  list<string>  $roles
     */
    public function sync(User $actor, User $subject, array $roles): User
    {
        $this->assertMayGrant($actor, $subject, $roles);

        $before = $subject->getRoleNames()->sort()->values()->all();
        $subject->syncRoles($roles);
        $after = $subject->fresh()->getRoleNames()->sort()->values()->all();

        if ($before !== $after) {
            // CLAUDE.md rule #9 names role changes as auditable, but the
            // observer only covers decisions and claims: spatie writes the
            // pivot directly, so no model event ever fires here.
            $this->auditLog->log($actor, 'roles_synced', $subject, [
                'before' => $before,
                'after' => $after,
            ]);
        }

        return $subject->fresh();
    }

    /**
     * @param  list<string>  $roles
     */
    private function assertMayGrant(User $actor, User $subject, array $roles): void
    {
        if ($actor->hasRole(RoleName::SuperAdmin->value)) {
            $this->assertNotSelfDemotion($actor, $subject, $roles);

            return;
        }

        $current = $subject->getRoleNames()->all();
        $touched = array_merge(array_diff($roles, $current), array_diff($current, $roles));

        foreach ($touched as $role) {
            if (in_array($role, self::RESERVED, true)) {
                throw ValidationException::withMessages([
                    'roles' => ['لا تملك صلاحية منح هذا الدور أو سحبه.'],
                ]);
            }
        }

        $this->assertNotSelfDemotion($actor, $subject, $roles);
    }

    /**
     * @param  list<string>  $roles
     */
    private function assertNotSelfDemotion(User $actor, User $subject, array $roles): void
    {
        if ($actor->id !== $subject->id) {
            return;
        }

        $administrative = [RoleName::Admin->value, RoleName::SuperAdmin->value];
        $keptOne = array_intersect($roles, $administrative) !== [];

        // Removing your own last administrative role locks the console for
        // everyone but whoever else happens to hold one.
        if (! $keptOne) {
            throw ValidationException::withMessages([
                'roles' => ['لا يمكنك سحب صلاحيتك الإدارية من نفسك.'],
            ]);
        }
    }
}
